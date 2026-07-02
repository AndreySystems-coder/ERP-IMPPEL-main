import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage, COMPLETE_BACKUP_MODULE_TABLES, type CompleteBackupModule } from "./storage";
import {
  buildRestorePreview,
  buildCompleteBackupPackage,
  flattenCompleteBackupData,
  flattenTechnicalBackupPayload,
  validateTechnicalBackupPayload,
  validateCompleteBackupPackage,
} from "./complete-backup";
import { api } from "@shared/routes";
import { insertCostConfigSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  TECHNICAL_TEAM_ROLE,
  generateInitialPassword,
  normalizeOperationalEmployee,
  type OperationalEmployeeInput,
} from "@shared/operationalUsers";
import { getMaterialReturnPolicyLabel, hasReturnableMaterialItems, isMaterialWithdrawalPending, normalizeReturnCondition, shouldRestoreReturnedQuantityToStock } from "@shared/materialReturnPolicy";
import { getEffectiveMaterialSaleDiscountLimit } from "@shared/materialSalesPolicy";
import { buildMobileNotesPreview, summarizeMobileRows, type MobileImportPreviewRow } from "@shared/mobileNotesImport";
import { previewErpPdfBuffer } from "./pdf-restore";

const BCRYPT_ROUNDS = 10;
const operationalResetTokens = new Map<string, number>();
const MONTHS_PT_BR = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function assertMaterialStockAvailability(
  items: Array<{ inventoryId: number; productName: string; quantity: number }>,
  availableById: Map<number, number>,
) {
  for (const item of items) {
    const available = availableById.get(Number(item.inventoryId)) ?? 0;
    if (item.quantity > available) {
      throw new Error(`Estoque insuficiente para ${item.productName}: solicitado ${item.quantity}, disponível ${available}.`);
    }
    availableById.set(Number(item.inventoryId), available - item.quantity);
  }
}

function mobileImportHash(text: string, importYear: number) {
  return createHash("sha256").update(`${importYear}\n${text.trim()}`).digest("hex");
}

function parseMobileImportYear(value: unknown) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error("Ano da importação é obrigatório e deve estar entre 2020 e 2100.");
  }
  return year;
}

function normalizeMoneyReais(value: unknown, options: { fallback?: number; field?: string } = {}) {
  const fallback = options.fallback ?? 0;
  if (value === null || value === undefined || value === "") return fallback;
  let normalized: number;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return fallback;
    const hasComma = raw.includes(",");
    const cleaned = raw.replace(/[^\d,.-]/g, "");
    const decimalNormalized = hasComma
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned;
    normalized = Number(decimalNormalized);
  } else {
    normalized = Number(value);
  }
  if (!Number.isFinite(normalized) || normalized < 0) return fallback;

  // Defensive guard for values accidentally submitted in cents by masked inputs.
  // ERP schemas store real/float monetary values in reais.
  if (Number.isInteger(normalized) && normalized >= 10000) {
    const centsCandidate = normalized / 100;
    if (centsCandidate <= 5000) return Number(centsCandidate.toFixed(2));
  }
  return Number(normalized.toFixed(2));
}

function normalizePercent(value: unknown, fallback = 0) {
  const numeric = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Number(numeric.toFixed(2))));
}

function normalizeProductPricingPayload<T extends Record<string, any>>(payload: T, fallback: Record<string, any> = {}) {
  return {
    ...payload,
    salePrice: normalizeMoneyReais(payload.salePrice, { fallback: Number(fallback.salePrice) || 0, field: "salePrice" }),
    commission: normalizeMoneyReais(payload.commission, { fallback: Number(fallback.commission) || 0, field: "commission" }),
    maxDiscount: normalizePercent(payload.maxDiscount, Number(fallback.maxDiscount) || 0),
  };
}

function normalizeInventoryPricingPayload<T extends Record<string, any>>(payload: T, fallback: Record<string, any> = {}) {
  return {
    ...payload,
    pricePerUnit: normalizeMoneyReais(payload.pricePerUnit, { fallback: Number(fallback.pricePerUnit) || 0, field: "pricePerUnit" }),
  };
}

function normalizeServicePricingPayload<T extends Record<string, any>>(payload: T, fallback: Record<string, any> = {}) {
  return {
    ...payload,
    pricePerUnit: normalizeMoneyReais(payload.pricePerUnit, { fallback: Number(fallback.pricePerUnit) || 0, field: "pricePerUnit" }),
    laborCostPerM2: normalizeMoneyReais(payload.laborCostPerM2, { fallback: Number(fallback.laborCostPerM2) || 0, field: "laborCostPerM2" }),
    transportCostPerM2: normalizeMoneyReais(payload.transportCostPerM2, { fallback: Number(fallback.transportCostPerM2) || 0, field: "transportCostPerM2" }),
  };
}

function normalizeMobileImportRows(rows: unknown): MobileImportPreviewRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row: any, index) => ({
    id: String(row.id || `manual-${index}`),
    order: Number.isFinite(Number(row.order)) ? Number(row.order) : index,
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(row.date || "")) ? String(row.date) : new Date().toISOString().slice(0, 10),
    type: row.type === "entrada" || row.type === "retirada" ? row.type : "saida",
    quantity: Math.max(1, Math.trunc(Number(row.quantity) || 1)),
    rawText: String(row.rawText || row.rawItem || ""),
    rawItem: String(row.rawItem || row.itemName || ""),
    inventoryId: row.inventoryId ? Number(row.inventoryId) : null,
    itemName: row.itemName ? String(row.itemName) : null,
    itemConfidence: Math.max(0, Math.min(100, Number(row.itemConfidence) || 0)),
    rawEmployee: row.rawEmployee ? String(row.rawEmployee) : null,
    userId: row.userId ? Number(row.userId) : null,
    username: row.username ? String(row.username) : null,
    userConfidence: row.userConfidence == null ? undefined : Math.max(0, Math.min(100, Number(row.userConfidence) || 0)),
    status: row.status === "ok" || row.status === "duvidoso" || row.status === "bloqueado" ? row.status : "duvidoso",
    warnings: Array.isArray(row.warnings) ? row.warnings.map(String) : [],
    ignored: Boolean(row.ignored),
  })).sort((a, b) => a.order - b.order);
}

function assertMobileImportRowsReady(rows: MobileImportPreviewRow[]) {
  const pending = rows.filter(row => !row.ignored && (
    row.status !== "ok" ||
    !row.inventoryId ||
    row.quantity <= 0 ||
    (row.type === "retirada" && !row.userId)
  ));
  if (pending.length) {
    throw new Error(`Existem ${pending.length} item(ns) pendente(s) no preview. Corrija ou ignore antes de confirmar.`);
  }
}

function assertMobileImportStock(rows: MobileImportPreviewRow[], inventoryItems: any[]) {
  const inventoryById = new Map(inventoryItems.map(item => [Number(item.id), item]));
  const availableById = new Map(inventoryItems.map(item => [Number(item.id), Math.max(0, Number(item.quantity) || 0)]));
  for (const row of rows.filter(item => !item.ignored).sort((a, b) => a.order - b.order)) {
    const item = row.inventoryId ? inventoryById.get(Number(row.inventoryId)) : null;
    if (!item) throw new Error(`Material não encontrado no preview: ${row.rawItem}`);
    const available = availableById.get(Number(row.inventoryId)) ?? 0;
    if (row.type === "entrada") {
      availableById.set(Number(row.inventoryId), available + row.quantity);
      continue;
    }
    if (row.quantity > available) {
      throw new Error(`Estoque insuficiente para ${item.name}: solicitado ${row.quantity}, disponível ${available}.`);
    }
    availableById.set(Number(row.inventoryId), available - row.quantity);
  }
}

function operationalDate(value?: string | Date | null) {
  if (!value) return "";
  const raw = value instanceof Date ? value.toISOString() : String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : raw.slice(0, 10);
}

function isMaterialPeriodMatch(date: string, period: string, year?: string, month?: string) {
  if (!date) return false;
  if (period === "all") return true;
  if (period === "year") return Boolean(year) && date.startsWith(`${year}-`);
  if (period === "month") {
    if (!year || !month) return false;
    return date.startsWith(`${year}-${month.padStart(2, "0")}`);
  }
  return true;
}

function buildMaterialControlExportPayload(params: {
  withdrawals: any[];
  movements: any[];
  period: string;
  year?: string;
  month?: string;
}) {
  const period = params.period === "month" || params.period === "year" ? params.period : "all";
  const year = params.year && /^\d{4}$/.test(params.year) ? params.year : undefined;
  const month = params.month && /^\d{1,2}$/.test(params.month) ? params.month.padStart(2, "0") : undefined;
  const label = period === "month" && year && month
    ? `${MONTHS_PT_BR[Number(month) - 1]}/${year}`
    : period === "year" && year
      ? year
      : "Todos os meses";

  const withdrawals = params.withdrawals.filter(withdrawal =>
    isMaterialPeriodMatch(operationalDate(withdrawal.withdrawalDate || withdrawal.createdAt), period, year, month)
  );
  const entries = params.movements.filter(movement => {
    const type = String(movement.type || "").toUpperCase();
    return type === "ENTRADA" && isMaterialPeriodMatch(operationalDate(movement.date), period, year, month);
  });
  const consumption = params.movements.filter(movement => {
    const type = String(movement.type || "").toUpperCase();
    const isConsumption = type === "SAÍDA" || type === "SAIDA";
    const fromWithdrawal = String(movement.notes || "").toLowerCase().includes("retirada #");
    return isConsumption && !fromWithdrawal && isMaterialPeriodMatch(operationalDate(movement.date), period, year, month);
  });
  const days = new Map<string, { withdrawals: any[]; entries: any[]; consumption: any[] }>();
  for (const withdrawal of withdrawals) {
    const date = operationalDate(withdrawal.withdrawalDate || withdrawal.createdAt);
    const group = days.get(date) || { withdrawals: [], entries: [], consumption: [] };
    group.withdrawals.push(withdrawal);
    days.set(date, group);
  }
  for (const movement of entries) {
    const date = operationalDate(movement.date);
    const group = days.get(date) || { withdrawals: [], entries: [], consumption: [] };
    group.entries.push(movement);
    days.set(date, group);
  }
  for (const movement of consumption) {
    const date = operationalDate(movement.date);
    const group = days.get(date) || { withdrawals: [], entries: [], consumption: [] };
    group.consumption.push(movement);
    days.set(date, group);
  }

  return {
    type: "materiais",
    version: "1.1",
    exportedAt: new Date().toISOString(),
    filters: { period, year: year || null, month: month || null, label },
    data: {
      withdrawals,
      entries,
      consumption,
      days: Array.from(days.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, group]) => ({ date, ...group })),
    },
  };
}

const DEFAULT_SALARY_DISCOUNT_RULES = [
  { name: "Bom - sem desconto", condition: "bom", discountType: "fixo", discountValue: 0, active: true },
  { name: "Manutenção - avaliar responsabilidade", condition: "manutencao", discountType: "fixo", discountValue: 0, active: true },
  { name: "Ferramenta danificada - aprovação manual", condition: "danificado", discountType: "fixo", discountValue: 0, active: true },
  { name: "Ferramenta perdida - aprovação manual", condition: "perdido", discountType: "fixo", discountValue: 0, active: true },
];

function normalizeAuditName(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildArtificialDataAudit(params: { inventory: any[]; movements: any[]; users: any[] }) {
  const suspiciousStockValues = new Set([100, 898, 10000]);
  const byName = new Map<string, any[]>();
  for (const item of params.inventory) {
    const key = normalizeAuditName(item.name);
    if (!key) continue;
    byName.set(key, [...(byName.get(key) || []), item]);
  }
  const aliasOnlyNames = new Set(["lequinho", "biro", "tio", "borracha", "jhones", "jones"]);
  const stockSuspects = params.inventory
    .filter(item => suspiciousStockValues.has(Number(item.quantity)))
    .map(item => ({
      id: item.id,
      name: item.name,
      quantity: Number(item.quantity),
      reason: `Saldo ${item.quantity} é valor comum de carga artificial ou teste.`,
      suggestedAction: "Conferir contagem física antes de ajustar.",
    }));
  const duplicateMaterials = Array.from(byName.values())
    .filter(items => items.length > 1)
    .map(items => ({
      name: items[0]?.name,
      ids: items.map(item => item.id),
      count: items.length,
      reason: "Mesmo nome normalizado aparece mais de uma vez no estoque.",
      suggestedAction: "Unificar cadastro após backup e conferência.",
    }));
  const oldMovements = params.movements
    .filter(movement => operationalDate(movement.date).startsWith("2025-"))
    .slice(0, 200)
    .map(movement => ({
      id: movement.id,
      productName: movement.productName,
      type: movement.type,
      quantity: movement.quantity,
      date: movement.date,
      reason: "Movimentação em 2025 pode ser histórica ou importação antiga.",
      suggestedAction: "Validar se deve permanecer no histórico ou ficar apenas em backup.",
    }));
  const aliasUsers = params.users
    .filter(user => aliasOnlyNames.has(normalizeAuditName(user.username || user.fullName || user.name)))
    .map(user => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName || user.name,
      reason: "Usuário parece ter sido criado apenas por apelido.",
      suggestedAction: "Conferir nome completo e cargo antes de usar em produção.",
    }));
  const artificialTools = params.inventory
    .filter(item => String(item.type || "").toLowerCase().includes("ferramenta") && suspiciousStockValues.has(Number(item.quantity)))
    .map(item => ({
      id: item.id,
      name: item.name,
      quantity: Number(item.quantity),
      reason: "Ferramenta retornável com saldo típico de teste.",
      suggestedAction: "Zerar/recontar somente após backup e aprovação.",
    }));

  return {
    generatedAt: new Date().toISOString(),
    safeMode: true,
    message: "Auditoria somente leitura. Nenhum dado foi alterado.",
    suspects: {
      stockSuspects,
      oldMovements,
      aliasUsers,
      duplicateMaterials,
      artificialTools,
    },
    summary: {
      stockSuspects: stockSuspects.length,
      oldMovements: oldMovements.length,
      aliasUsers: aliasUsers.length,
      duplicateMaterials: duplicateMaterials.length,
      artificialTools: artificialTools.length,
    },
  };
}

function resolveSaleInventoryItem(product: any, inventoryItems: any[]) {
  if (product?.inventoryId) {
    const byId = inventoryItems.find(item => Number(item.id) === Number(product.inventoryId));
    if (byId) return byId;
  }
  const productName = normalizeAuditName(product?.name);
  if (!productName) return null;
  return inventoryItems.find(item => normalizeAuditName(item.name) === productName) || null;
}

const operationalEmployeeSchema = z.object({
  nomeCompleto: z.string().min(2),
  dataNascimento: z.string().min(8).optional(),
  cargo: z.string().optional(),
  perfil: z.string().optional(),
  status: z.string().optional(),
  login: z.string().optional(),
  senhaInicial: z.string().optional(),
});

// ─── Auth Middleware ─────────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  if (req.session.userRole !== "admin") {
    return res.status(403).json({ message: "Acesso restrito. Apenas administradores." });
  }
  next();
}

const DEFAULT_EMPLOYEE_PERMISSIONS = new Set([
  "viewWorks",
  "viewObraRegistro",
  "viewTeam",
  "registrarMaterials",
]);

const DEFAULT_ROLE_PERMISSIONS: Array<{ name: string; label: string; permissions: Record<string, boolean> }> = [
  {
    name: "administrativo_financeiro",
    label: "Administrativo / Financeiro",
    permissions: {
      viewDashboard: true, viewFinancials: true, viewPayments: true, viewCashFlow: true, viewFinancialSettings: true,
      viewClients: true, viewQuotes: true, viewWorks: true, viewWorkOrders: true, viewBackups: true, viewExports: true,
    },
  },
  {
    name: "comercial_atendimento",
    label: "Comercial / Atendimento",
    permissions: {
      viewCrm: true, viewLeads: true, viewCrmWhatsapp: true, viewClients: true,
      viewQuotes: true, viewQuoteTemplates: true, viewQuoteRules: true, viewWorks: true, viewWorkOrders: true,
    },
  },
  {
    name: "marketing_redes_sociais",
    label: "Marketing / Redes Sociais",
    permissions: {
      viewDashboard: true, viewCrm: true, viewLeads: true, viewCrmWhatsapp: true, viewClients: true, viewPostSale: true,
    },
  },
  {
    name: "equipe_tecnica",
    label: "Equipe Técnica",
    permissions: {
      viewWorks: true, viewWorkOrders: true, viewObraRegistro: true,
      viewTeam: true, registrarMaterials: true, viewInventory: true, viewInventoryCurrent: true, viewInventoryMovements: true,
    },
  },
  {
    name: "gestor_obras",
    label: "Gestor de Obras",
    permissions: {
      viewDashboard: true, viewWorks: true, viewWorkOrders: true, viewAllWorkOrders: true, editWorkOrders: true,
      viewObraRegistro: true, viewCalendar: true, viewTeam: true, viewProductivity: true, registrarMaterials: true,
      viewAllMaterials: true, viewInventory: true, viewInventoryCurrent: true, viewInventoryMovements: true,
    },
  },
];

const COMPATIBLE_PERMISSIONS: Record<string, string[]> = {
  viewCrm: ["viewLeads", "viewCrmWhatsapp", "viewClients"],
  viewQuotes: ["viewQuoteTemplates", "viewQuoteRules"],
  viewWorks: ["viewWorkOrders", "viewObraRegistro", "viewCalendar"],
  viewWorkOrders: ["viewAllWorkOrders"],
  viewInventory: ["viewInventoryCurrent", "viewInventoryCount", "viewInventoryMovements"],
  viewInventoryCurrent: ["viewInventory"],
  viewInventoryMovements: ["viewInventory"],
  viewTeam: ["viewProductivity", "registrarMaterials", "viewMaterialSales", "viewWarranties", "viewPostSale"],
  viewMaterialSales: ["createMaterialSales", "approveMaterialSales"],
  viewFinancials: ["viewPayments", "viewCashFlow", "viewFinancialSettings"],
  viewCashFlow: ["viewFinancials"],
  viewSettings: ["viewCostSettings", "viewStatusSettings", "viewUsers", "viewPriorityRules"],
  viewBackups: ["viewBackupGeneration", "viewRestore", "viewExports"],
};

function permissionMatches(permissions: Record<string, boolean>, permission: string) {
  if (permissions[permission]) return true;
  return (COMPATIBLE_PERMISSIONS[permission] || []).some((key) => permissions[key]);
}

function normalizeRoleName(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parsePermissionPayload(value: unknown) {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return value && typeof value === "object" ? value as Record<string, boolean> : {};
}

async function getEffectiveUserPermissions(userId: number) {
  const user = await storage.getUser(userId);
  if (!user) return null;
  if (user.role === "admin") return { user, isAdmin: true, permissions: null as Record<string, boolean> | null };

  if (!(user as any).roleId) {
    const permissions = Object.fromEntries(Array.from(DEFAULT_EMPLOYEE_PERMISSIONS).map((permission) => [permission, true]));
    return { user, isAdmin: false, permissions };
  }

  const customRole = await storage.getRole((user as any).roleId);
  let permissions: Record<string, boolean> = {};
  if (customRole) {
    try { permissions = JSON.parse(customRole.permissions); } catch {}
  }
  return { user, isAdmin: false, permissions };
}

async function userHasAnyPermission(userId: number, permissionsToCheck: string[]) {
  const effective = await getEffectiveUserPermissions(userId);
  if (!effective) return false;
  if (effective.isAdmin) return true;
  return permissionsToCheck.some((permission) => permissionMatches(effective.permissions || {}, permission));
}

function requireAnyPermission(permissionsToCheck: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    if (await userHasAnyPermission(req.session.userId, permissionsToCheck)) {
      return next();
    }
    return res.status(403).json({ message: "Acesso restrito para o cargo atual." });
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  async function ensureDefaultSalaryDiscountRules() {
    const existingRules = await storage.getSalaryDiscountRules();
    for (const defaultRule of DEFAULT_SALARY_DISCOUNT_RULES) {
      const existing = existingRules.find(rule => rule.condition === defaultRule.condition);
      if (existing) {
        if (!existing.name) {
          await storage.updateSalaryDiscountRule(existing.id, {
            name: defaultRule.name,
          });
        }
        continue;
      }
      await storage.createSalaryDiscountRule(defaultRule);
    }
  }

  async function ensureTechnicalTeamRole() {
    const roles = await storage.getRoles();
    const existing = roles.find(role => role.name === TECHNICAL_TEAM_ROLE.name || role.label === TECHNICAL_TEAM_ROLE.label);
    const forbidden = [
      "viewFinancials", "viewPayments", "viewCashFlow", "viewFinancialSettings",
      "viewSettings", "viewCostSettings", "viewStatusSettings", "viewUsers",
      "viewPriorityRules", "viewBackups", "viewBackupGeneration", "viewRestore",
      "viewExports", "editInventory", "viewAllMaterials",
    ];

    if (existing) {
      const currentPermissions = (() => { try { return JSON.parse(existing.permissions || "{}"); } catch { return {}; } })();
      const expectedPermissions: Record<string, boolean> = { ...currentPermissions, ...TECHNICAL_TEAM_ROLE.permissions };
      forbidden.forEach(permission => { expectedPermissions[permission] = false; });
      return await storage.updateRole(existing.id, {
        label: TECHNICAL_TEAM_ROLE.label,
        permissions: JSON.stringify(expectedPermissions),
        isDefault: true,
      }) || existing;
    }

    const permissions: Record<string, boolean> = { ...TECHNICAL_TEAM_ROLE.permissions };
    forbidden.forEach(permission => { permissions[permission] = false; });
    return storage.createRole({
      name: TECHNICAL_TEAM_ROLE.name,
      label: TECHNICAL_TEAM_ROLE.label,
      permissions: JSON.stringify(permissions),
      isDefault: true,
    });
  }

  await ensureDefaultSalaryDiscountRules().catch(error => {
    console.error("[startup] Falha ao garantir regras padrão de desconto:", error);
  });

  async function ensureDefaultRoles() {
    await ensureTechnicalTeamRole();
    const existingRoles = await storage.getRoles();
    const byName = new Map(existingRoles.map(role => [role.name, role]));
    const byLabel = new Map(existingRoles.map(role => [role.label.toLocaleLowerCase("pt-BR"), role]));
    for (const def of DEFAULT_ROLE_PERMISSIONS) {
      const existing = byName.get(def.name) || byLabel.get(def.label.toLocaleLowerCase("pt-BR"));
      if (existing) {
        const current = parsePermissionPayload(existing.permissions);
        await storage.updateRole(existing.id, {
          name: def.name,
          label: def.label,
          permissions: JSON.stringify({ ...def.permissions, ...current }),
          isDefault: true,
        });
      } else {
        await storage.createRole({
          name: def.name,
          label: def.label,
          permissions: JSON.stringify(def.permissions),
          isDefault: true,
        });
      }
    }
  }

  // Seed data function
  async function seedDatabase() {
    const defaultSettings = [
      { key: "monthlyFixedCosts", value: 30000 },
      { key: "expectedMonthlyRevenue", value: 120000 },
      { key: "taxPercentage", value: 0.15 },
      { key: "commissionPercentage", value: 0.05 },
      { key: "targetMarginPercentage", value: 0.30 },
      { key: "cardFeePercentage", value: 0.03 },
      { key: "fixedCostAllocation", value: 0.15 },
      { key: "targetMargin", value: 0.20 },
      { key: "taxRate", value: 0.10 },
      { key: "contributionMargin", value: 0.40 },
      { key: "regionBZonePercent", value: 0.15 },
      { key: "regionCZonePercent", value: 0.25 }
    ];

    const currentSettings = await storage.getSettings();
    if (currentSettings.length === 0) {
      for (const setting of defaultSettings) {
        await storage.updateSetting(setting.key, setting.value);
      }
    }
    
    const DEFAULT_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || "Admin";
    const DEFAULT_PASSWORD =
      process.env.DEFAULT_ADMIN_PASSWORD ||
      (process.env.NODE_ENV === "production" ? "" : "dev-admin-password-change-me");

    if (!DEFAULT_PASSWORD) {
      throw new Error("DEFAULT_ADMIN_PASSWORD must be set before seeding the first admin user in production.");
    }

    let adminUser =
      (await storage.getUserByUsername(DEFAULT_USERNAME)) ||
      (await storage.getUserByUsername("admin")); // migrate lowercase legacy

    if (!adminUser) {
      const hashed = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
      await storage.createUser({ username: DEFAULT_USERNAME, password: hashed, role: "admin" });
    } else {
      // Ensure role is admin, username is correct, and password is bcrypt-hashed
      const isHashed = adminUser.password.startsWith("$2");
      if (!isHashed || adminUser.role !== "admin" || adminUser.username !== DEFAULT_USERNAME) {
        const hashed = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
        await storage.updateUser(adminUser.id, {
          username: DEFAULT_USERNAME,
          password: hashed,
          role: "admin",
        });
      }
    }

    await ensureDefaultRoles();

    // Seed cost config defaults on startup
    const existingCostConfig = await storage.getCostConfig();
    if (!existingCostConfig) {
      await storage.updateCostConfig({
        laborDailyRate: 800,
        laborHourlyRate: 100,
        transportCostPerKm: 1.5,
        transportMinimumCost: 50,
        minMarginPercent: 0.30,
        idealMarginPercent: 0.40,
        alertMarginPercent: 0.30,
        prohibitedMarginPercent: 0.25,
        minimumServiceValue: 1000,
      });
    }

    // Seed default WhatsApp flows
    const existingFlows = await storage.getWhatsappFlows();
    if (existingFlows.length === 0) {
      const atendimentoButtons = JSON.stringify([
        { id: "1", text: "📋 Fazer um orçamento", responseMessage: "Ótimo! Posso te ajudar passo a passo. 😊\n\nQual é o problema de infiltração que você está enfrentando?\n\n• Laje / Terraço\n• Piscina\n• Parede / Fachada\n• Banheiro / Área molhada\n• Outro problema\n\nDescreva o que está acontecendo e enviaremos um orçamento rápido! 🏗️" },
        { id: "2", text: "👨 Falar com atendente", responseMessage: "Entendido! Vou transferir você para um de nossos atendentes agora. 🔔\n\n⏰ Horário de atendimento:\nSegunda a Sexta: *8h às 18h*\nSábado: *8h às 13h*\n\nAguarde um instante, já vamos te atender! 😊" },
        { id: "3", text: "❓ Tirar dúvida técnica", responseMessage: "Claro! Sobre qual assunto é a sua dúvida? 🤔\n\n🔵 *Manta Asfáltica* — para lajes e terraços\n🟢 *Impermeabilização Líquida* — para banheiros e áreas molhadas\n🔵 *Piscinas* — impermeabilização e reparos\n🔴 *Garantia* — sobre prazos e cobertura\n❓ *Outra dúvida* — pode perguntar à vontade!\n\nQual desses temas é o seu? 👇" },
        { id: "4", text: "🏗️ Ver obras realizadas", responseMessage: "Amamos mostrar nosso trabalho! 😄\n\n📸 *Exemplos de obras recentes:*\n\n✅ Impermeabilização de laje residencial — Bairro Jardins (antes: infiltração severa | depois: totalmente seco)\n\n✅ Recuperação de piscina — Condomínio Alfa (antes: vazamento total | depois: estanque e funcional)\n\n✅ Impermeabilização de fachada — Ed. Central (antes: manchas e bolhas | depois: fachada nova)\n\nQuer um orçamento para seu projeto? É só pedir! 🏗️" },
      ]);
      const defaultFlows = [
        { name: "Atendimento Inicial (Novo Contato)", trigger: "atendimento_inicial", messageType: "buttons", message: "Olá! 👋 Somos da *IMPPEL Impermeabilização*.\n\nTudo bem? Como podemos te ajudar hoje?", buttons: atendimentoButtons, includePdf: false, active: true, sortOrder: 0 },
        { name: "Orçamento Enviado", trigger: "orcamento_enviado", messageType: "text", message: "Olá {nome_cliente}! 👋\n\nSeu orçamento *#{numero_orcamento}* da IMPPEL foi enviado com sucesso!\n\n📋 *Serviço:* {tipo_servico}\n💰 *Valor:* {valor_orcamento}\n\nQualquer dúvida, estou à disposição!\n\nEquipe IMPPEL 🏗️", includePdf: true, active: true, sortOrder: 1 },
        { name: "Orçamento Aprovado", trigger: "orcamento_aprovado", messageType: "text", message: "Parabéns {nome_cliente}! 🎉\n\nSeu orçamento *#{numero_orcamento}* foi aprovado!\n\nEstamos muito felizes em tê-lo como cliente. Em breve nossa equipe entrará em contato para agendar o início dos serviços.\n\nObrigado pela confiança!\nEquipe IMPPEL 🏗️", includePdf: false, active: true, sortOrder: 2 },
        { name: "Follow-up 2 Dias", trigger: "followup_2d", messageType: "text", message: "Olá {nome_cliente}! 😊\n\nPassaram 2 dias desde que enviamos seu orçamento *#{numero_orcamento}*.\n\nGostaria de saber se ficou alguma dúvida ou se precisa de mais informações?\n\nEstamos à disposição!\nEquipe IMPPEL 🏗️", includePdf: false, active: true, sortOrder: 3 },
        { name: "Follow-up 5 Dias", trigger: "followup_5d", messageType: "text", message: "Olá {nome_cliente}! 🤔\n\nJá faz 5 dias desde o envio do seu orçamento *#{numero_orcamento}*.\n\nSabemos que a decisão é importante. Podemos conversar sobre condições especiais ou tirar qualquer dúvida?\n\nEquipe IMPPEL 🏗️", includePdf: false, active: true, sortOrder: 4 },
        { name: "Obra Finalizada", trigger: "obra_finalizada", messageType: "text", message: "Olá {nome_cliente}! 🎊\n\nSua obra de *{tipo_servico}* foi concluída com sucesso!\n\nObrigado pela confiança na IMPPEL. Em anexo você encontra o relatório completo da obra e as informações de garantia.\n\n⭐ Sua opinião é muito importante para nós!\n\nEquipe IMPPEL 🏗️", includePdf: true, active: true, sortOrder: 5 },
        { name: "Lembrete de Manutenção (12 meses)", trigger: "manutencao_12m", messageType: "text", message: "Olá {nome_cliente}! 🔧\n\nJá faz *12 meses* desde a conclusão da sua obra de *{tipo_servico}*!\n\nRecomendamos uma vistoria preventiva para garantir a longevidade da impermeabilização.\n\nEntre em contato conosco para agendar!\n\nEquipe IMPPEL 🏗️", includePdf: false, active: true, sortOrder: 6 },
      ];
      for (const flow of defaultFlows) {
        await storage.createWhatsappFlow(flow);
      }
    } else {
      // Ensure the Atendimento Inicial flow exists even if other flows were seeded before
      // no-op: atendimento_inicial already exists or was just updated via SQL migration
    }
  }
  
  // Call seed async (fire and forget for now, or await if preferred)
  seedDatabase().catch(console.error);

  const toPublicUser = (user: any, extras: Record<string, unknown> = {}) => {
    const { password: _password, ...publicUser } = user || {};
    return { ...publicUser, ...extras };
  };

  const findUserByUsername = async (username: string) => {
    const normalized = String(username || "").trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return undefined;
    const exact = await storage.getUserByUsername(String(username).trim());
    if (exact) return exact;
    return (await storage.getUsers()).find(user => user.username.trim().toLocaleLowerCase("pt-BR") === normalized);
  };

  // Auth
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await findUserByUsername(input.username);
      if (!user) {
        return res.status(401).json({ message: "Usuário ou senha inválidos" });
      }
      if ((user as any).status === "inativo") {
        return res.status(403).json({ message: "Usuário inativo. Procure a administração." });
      }
      // Support both bcrypt-hashed passwords (start with $2) and legacy plaintext
      const isHashed = user.password.startsWith("$2");
      const passwordValid = isHashed
        ? await bcrypt.compare(input.password, user.password)
        : input.password === user.password;
      if (!passwordValid) {
        return res.status(401).json({ message: "Usuário ou senha inválidos" });
      }
      if (!isHashed) {
        await storage.updateUserPassword(user.id, await bcrypt.hash(input.password, BCRYPT_ROUNDS));
      }
      if ((user as any).mustChangePassword) {
        await storage.updateUser(user.id, { mustChangePassword: false } as any);
      }
      req.session.userId = user.id;
      req.session.userRole = user.role;
      res.status(200).json(toPublicUser({ ...user, mustChangePassword: false }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(401).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });
  
  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Não autenticado" });
    }
    // Attach permissions from the user's custom role (if any)
    let permissions: Record<string, boolean> = {};
    let roleName: string | null = null;
    let roleLabel: string | null = null;
    if ((user as any).roleId) {
      const customRole = await storage.getRole((user as any).roleId);
      if (customRole) {
        try { permissions = JSON.parse(customRole.permissions); } catch {}
        roleName = customRole.name;
        roleLabel = customRole.label;
      }
    }
    res.status(200).json(toPublicUser({ ...user, mustChangePassword: false }, { permissions, roleName, roleLabel }));
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {});
    res.status(200).json({ message: "Logged out" });
  });

  app.post("/api/auth/change-initial-password", requireAuth, async (req, res) => {
    try {
      const newPassword = String(req.body?.newPassword || "");
      if (newPassword.length < 8) return res.status(400).json({ message: "A nova senha deve ter pelo menos 8 caracteres." });
      const user = await storage.getUser(Number(req.session.userId));
      if (!user) return res.status(404).json({ message: "Usuário não encontrado." });
      if (!(user as any).mustChangePassword) return res.status(400).json({ message: "A troca inicial já foi concluída." });
      if (await bcrypt.compare(newPassword, user.password)) return res.status(400).json({ message: "Escolha uma senha diferente da senha inicial." });
      const password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await storage.updateUser(user.id, { password, mustChangePassword: false } as any);
      res.json({ message: "Senha alterada com sucesso." });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  // User management (admin only)
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      const allRoles = await storage.getRoles();
      res.json(allUsers.map(u => {
        const uAny = u as any;
        const customRole = allRoles.find(r => r.id === uAny.roleId);
        return {
          id: u.id, username: u.username, role: u.role,
          roleId: uAny.roleId || null,
          jobTitle: uAny.jobTitle || null,
          fullName: uAny.fullName || null,
          birthDate: uAny.birthDate || null,
          status: uAny.status || "ativo",
          mustChangePassword: false,
          roleName: customRole?.name || null,
          roleLabel: customRole?.label || null,
        };
      }));
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/users/operational/preview", requireAdmin, async (req, res) => {
    try {
      const employees = z.array(operationalEmployeeSchema).min(1).parse(req.body?.employees);
      const existingUsers = await storage.getUsers();
      const existingByLogin = new Map(existingUsers.map(user => [user.username.toLowerCase(), user]));
      const incomingLogins = new Set<string>();
      const rows = employees.map((employee, index) => {
        try {
          const normalized = normalizeOperationalEmployee(employee as OperationalEmployeeInput);
          const duplicateInFile = incomingLogins.has(normalized.login);
          incomingLogins.add(normalized.login);
          const existing = existingByLogin.get(normalized.login);
          return { ...normalized, row: index + 1, valid: !duplicateInFile, duplicateInFile, exists: !!existing, action: duplicateInFile ? "conflito" : existing ? "existente" : "criar", message: duplicateInFile ? "Login duplicado no arquivo." : existing ? "Usuário já existe; não será sobrescrito sem autorização." : "Pronto para criar." };
        } catch (err: any) {
          return { row: index + 1, valid: false, action: "erro", message: err.message, source: employee };
        }
      });
      res.json({ rows, summary: { total: rows.length, valid: rows.filter(row => row.valid).length, existing: rows.filter(row => (row as any).exists).length, errors: rows.filter(row => !row.valid).length } });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/users/operational/apply", requireAdmin, async (req, res) => {
    try {
      if (req.body?.confirmed !== true) return res.status(400).json({ message: "Confirme a importação após revisar o preview." });
      const employees = z.array(operationalEmployeeSchema).min(1).parse(req.body?.employees);
      const updateExisting = req.body?.updateExisting === true;
      const resetPasswords = req.body?.resetPasswords === true;
      const technicalRole = await ensureTechnicalTeamRole();
      const roles = await storage.getRoles();
      const existingUsers = await storage.getUsers();
      const existingByLogin = new Map(existingUsers.map(user => [user.username.toLowerCase(), user]));
      const result = { created: 0, existing: 0, updated: 0, errors: [] as Array<{ row: number; message: string }> };
      const seen = new Set<string>();
      for (let index = 0; index < employees.length; index++) {
        try {
          const employee = normalizeOperationalEmployee(employees[index] as OperationalEmployeeInput);
          if (seen.has(employee.login)) throw new Error("Login duplicado no arquivo.");
          seen.add(employee.login);
          const assignedRole = roles.find(item => item.label.toLowerCase() === employee.cargo.toLowerCase() || item.name.toLowerCase() === employee.cargo.toLowerCase()) || technicalRole;
          const existing = existingByLogin.get(employee.login);
          const profile = employee.perfil === "Administrador" ? "admin" : "funcionario";
          const status = employee.status === "Inativo" ? "inativo" : "ativo";
          if (existing) {
            if (!updateExisting) { result.existing++; continue; }
            const updates: any = { fullName: employee.nomeCompleto, birthDate: employee.dataNascimento, role: profile, roleId: assignedRole.id, jobTitle: assignedRole.label, status };
            if (resetPasswords) { updates.password = await bcrypt.hash(employee.senhaInicial, BCRYPT_ROUNDS); updates.mustChangePassword = false; }
            await storage.updateUser(existing.id, updates);
            result.updated++;
            continue;
          }
          await storage.createUser({
            username: employee.login,
            password: await bcrypt.hash(employee.senhaInicial, BCRYPT_ROUNDS),
            role: profile,
            roleId: assignedRole.id,
            jobTitle: assignedRole.label,
            fullName: employee.nomeCompleto,
            birthDate: employee.dataNascimento,
            status,
            mustChangePassword: false,
          } as any);
          result.created++;
        } catch (err: any) {
          result.errors.push({ row: index + 1, message: err.message });
        }
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/users/operational/export", requireAdmin, async (_req, res) => {
    try {
      const [allUsers, allRoles] = await Promise.all([storage.getUsers(), storage.getRoles()]);
      const rows = allUsers.filter(user => user.role !== "admin").map(user => {
        const item = user as any;
        const role = allRoles.find(entry => entry.id === item.roleId);
        return {
          login: user.username,
          senhaInicial: item.birthDate ? generateInitialPassword(item.birthDate) : "",
          nomeCompleto: item.fullName || user.username,
          cargo: role?.label || item.jobTitle || TECHNICAL_TEAM_ROLE.label,
          perfil: "Funcionário",
          status: item.status === "inativo" ? "Inativo" : "Ativo",
          trocaPendente: false,
        };
      });
      res.json({ type: "usuarios-operacionais", version: "1.0", exportedAt: new Date().toISOString(), data: rows });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const { username, password, role, roleId, jobTitle, fullName, birthDate, status } = req.body;
      if (!username || !password) return res.status(400).json({ message: "Usuário e senha obrigatórios" });
      const existing = await findUserByUsername(username);
      if (existing) return res.status(400).json({ message: "Nome de usuário já existe" });
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const newUser = await storage.createUser({ username, password: hashedPassword, role: role || "funcionario", fullName: fullName || null, birthDate: birthDate || null, status: status || "ativo", mustChangePassword: false } as any);
      if (roleId) await storage.updateUserRoleId(newUser.id, roleId);
      if (jobTitle) await storage.updateUserJobTitle(newUser.id, jobTitle);
      const updatedUser = await storage.getUser(newUser.id);
      const uAny = updatedUser as any;
      res.status(201).json({ id: newUser.id, username: newUser.username, role: newUser.role, roleId: uAny?.roleId, jobTitle: uAny?.jobTitle });
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getUser(id);
      if (!existing) return res.status(404).json({ message: "Usuário não encontrado" });
      const body = req.body || {};
      const updates: any = {};
      if (body.username !== undefined) {
        const username = String(body.username || "").trim();
        if (!username) return res.status(400).json({ message: "Usuário é obrigatório" });
        const found = await findUserByUsername(username);
        if (found && found.id !== id) return res.status(400).json({ message: "Nome de usuário já existe" });
        updates.username = username;
      }
      if (body.role !== undefined) {
        if (!["admin", "funcionario"].includes(body.role)) return res.status(400).json({ message: "Perfil inválido" });
        updates.role = body.role;
        if (body.role === "admin" && body.roleId === undefined) updates.roleId = null;
      }
      if (body.roleId !== undefined) updates.roleId = body.roleId ? Number(body.roleId) : null;
      if (body.jobTitle !== undefined) updates.jobTitle = String(body.jobTitle || "").trim() || null;
      if (body.fullName !== undefined) updates.fullName = String(body.fullName || "").trim() || null;
      if (body.birthDate !== undefined) updates.birthDate = String(body.birthDate || "").trim() || null;
      if (body.status !== undefined) updates.status = body.status === "inativo" || body.status === "Inativo" ? "inativo" : "ativo";
      updates.mustChangePassword = false;
      const initialPassword = String(body.initialPassword || body.senhaInicial || "").replace(/\D/g, "");
      if (initialPassword) {
        if (initialPassword.length !== 8) return res.status(400).json({ message: "Senha inicial deve estar no formato DDMMAAAA" });
        updates.password = await bcrypt.hash(initialPassword, BCRYPT_ROUNDS);
        updates.mustChangePassword = false;
        if (!updates.birthDate && !(existing as any).birthDate) updates.birthDate = `${initialPassword.slice(0, 2)}/${initialPassword.slice(2, 4)}/${initialPassword.slice(4)}`;
      }
      const updated = await storage.updateUser(id, updates);
      if (updated && req.session.userId === id) {
        req.session.userRole = updated.role;
      }
      res.json(toPublicUser(updated));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Internal Error" });
    }
  });

  app.patch("/api/users/:id/role", requireAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      if (!["admin", "funcionario"].includes(role)) return res.status(400).json({ message: "Role inválida" });
      const updated = await storage.updateUserRole(Number(req.params.id), role);
      if (!updated) return res.status(404).json({ message: "Usuário não encontrado" });
      if (req.session.userId === updated.id) req.session.userRole = updated.role;
      res.json({ id: updated.id, username: updated.username, role: updated.role });
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.patch("/api/users/:id/password", requireAdmin, async (req, res) => {
    try {
      const { password } = req.body;
      if (!password || password.length < 4) return res.status(400).json({ message: "Senha deve ter no mínimo 4 caracteres" });
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const updated = await storage.updateUser(Number(req.params.id), { password: hashedPassword, mustChangePassword: false } as any);
      if (!updated) return res.status(404).json({ message: "Usuário não encontrado" });
      res.json({ message: "Senha atualizada" });
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.patch("/api/users/:id/role-id", requireAdmin, async (req, res) => {
    try {
      const { roleId } = req.body;
      const updated = await storage.updateUserRoleId(Number(req.params.id), roleId ?? null);
      if (!updated) return res.status(404).json({ message: "Usuário não encontrado" });
      res.json({ message: "Cargo atualizado" });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.patch("/api/users/:id/job-title", requireAdmin, async (req, res) => {
    try {
      const { jobTitle } = req.body;
      const updated = await storage.updateUserJobTitle(Number(req.params.id), jobTitle || "");
      if (!updated) return res.status(404).json({ message: "Usuário não encontrado" });
      res.json({ message: "Título atualizado" });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Roles / Cargos ───────────────────────────────────────────────────────
  app.get("/api/roles", requireAdmin, async (req, res) => {
    try { await ensureDefaultRoles(); res.json(await storage.getRoles()); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/roles", requireAdmin, async (req, res) => {
    try {
      const { name, label, permissions, isDefault } = req.body;
      if (!name || !label) return res.status(400).json({ message: "name e label são obrigatórios" });
      const role = await storage.createRole({ name: normalizeRoleName(String(name)), label, permissions: JSON.stringify(parsePermissionPayload(permissions)), isDefault: isDefault || false });
      res.status(201).json(role);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/roles/:id", requireAdmin, async (req, res) => {
    try {
      const { name, label, permissions, isDefault } = req.body;
      const upd: any = {};
      if (name !== undefined) upd.name = normalizeRoleName(String(name));
      if (label !== undefined) upd.label = label;
      if (permissions !== undefined) upd.permissions = JSON.stringify(parsePermissionPayload(permissions));
      if (isDefault !== undefined) upd.isDefault = isDefault;
      const updated = await storage.updateRole(Number(req.params.id), upd);
      if (!updated) return res.status(404).json({ message: "Cargo não encontrado" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/roles/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteRole(Number(req.params.id));
      res.status(204).send();
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (id === req.session.userId) return res.status(400).json({ message: "Não é possível excluir seu próprio usuário" });
      await storage.deleteUser(id);
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Route-level access control ────────────────────────────────────────────
  // Admin-only API routes
  const restrictedPrefixes = [
    { prefix: "/api/clients", permissions: ["viewClients"] },
    { prefix: "/api/leads", permissions: ["viewLeads"] },
    { prefix: "/api/jobs", permissions: ["viewQuotes"] },
    { prefix: "/api/work-orders", permissions: ["viewWorkOrders", "viewAllWorkOrders"], readPermissions: ["viewWorkOrders", "viewAllWorkOrders", "registrarMaterials"] },
    { prefix: "/api/payments", permissions: ["viewPayments"] },
    { prefix: "/api/products", permissions: ["viewInventory", "viewInventoryCurrent"], readPermissions: ["viewInventory", "viewInventoryCurrent", "viewMaterialSales", "createMaterialSales", "approveMaterialSales"] },
    { prefix: "/api/material-sales", permissions: ["viewMaterialSales", "createMaterialSales", "approveMaterialSales"] },
    { prefix: "/api/services", permissions: ["viewQuoteRules"] },
    { prefix: "/api/inventory", permissions: ["viewInventory", "viewInventoryCurrent", "viewInventoryMovements", "editInventory"], readPermissions: ["viewInventory", "viewInventoryCurrent", "viewInventoryMovements", "editInventory", "registrarMaterials"] },
    { prefix: "/api/transactions", permissions: ["viewFinancials", "viewCashFlow"] },
    { prefix: "/api/settings", permissions: ["viewSettings"] },
    { prefix: "/api/cost-config", permissions: ["viewCostSettings"] },
    { prefix: "/api/priority-rules", permissions: ["viewPriorityRules"] },
    { prefix: "/api/dashboard", permissions: ["viewDashboard"] },
    { prefix: "/api/catalog", permissions: ["viewInventory", "viewInventoryCurrent"] },
    { prefix: "/api/mobile-import", permissions: ["viewInventory", "viewInventoryCurrent", "editInventory"] },
    { prefix: "/api/job-tracking", permissions: ["viewWorkOrders", "viewAllWorkOrders"] },
    { prefix: "/api/scheduling", permissions: ["viewCalendar"] },
    { prefix: "/api/obra-registros", permissions: ["viewObraRegistro"] },
    { prefix: "/api/obra-consumo-logs", permissions: ["registrarMaterials", "viewWorkOrders", "viewAllWorkOrders"] },
    { prefix: "/api/job-statuses", permissions: ["viewStatusSettings"] },
    { prefix: "/api/payment-methods", permissions: ["viewFinancialSettings"] },
    { prefix: "/api/payment-conditions", permissions: ["viewFinancialSettings"] },
    { prefix: "/api/contracts", permissions: ["viewSettings"] },
    { prefix: "/api/warranties", permissions: ["viewWarranties"] },
    { prefix: "/api/warranty-incidents", permissions: ["viewWarranties"] },
    { prefix: "/api/production-logs", permissions: ["viewProductivity"] },
    { prefix: "/api/nps-responses", permissions: ["viewPostSale"] },
    { prefix: "/api/maintenance-reminders", permissions: ["viewPostSale"] },
    { prefix: "/api/material-withdrawals", permissions: ["registrarMaterials", "viewAllMaterials"] },
  ];
  app.use((req, res, next) => {
    const restrictedRoute = restrictedPrefixes.find(({ prefix }) => req.path.startsWith(prefix));
    if (restrictedRoute) {
      const permissions = req.method === "GET" && "readPermissions" in restrictedRoute
        ? (restrictedRoute.readPermissions || restrictedRoute.permissions)
        : restrictedRoute.permissions;
      return requireAnyPermission(permissions)(req, res, next);
    }
    next();
  });
  // Obra registros require at least auth (funcionarios allowed)
  app.use("/api/obra-registros", requireAuth);

  // Clients
  app.get(api.clients.list.path, async (req, res) => {
    const clientList = await storage.getClients();
    res.json(clientList);
  });
  app.get(api.clients.get.path, async (req, res) => {
    const client = await storage.getClient(Number(req.params.id));
    if (!client) return res.status(404).json({ message: "Not found" });
    res.json(client);
  });
  app.post(api.clients.create.path, async (req, res) => {
    try {
      const input = api.clients.create.input.parse(req.body);
      const client = await storage.createClient(input);
      res.status(201).json(client);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });
  app.put(api.clients.update.path, async (req, res) => {
    try {
      const input = api.clients.update.input.parse(req.body);
      const client = await storage.updateClient(Number(req.params.id), input);
      if (!client) return res.status(404).json({ message: "Not found" });
      res.json(client);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });
  app.delete(api.clients.delete.path, async (req, res) => {
    await storage.deleteClient(Number(req.params.id));
    res.status(204).end();
  });

  // Services
  app.get(api.services.list.path, async (req, res) => {
    const serviceList = await storage.getServices();
    res.json(serviceList);
  });
  app.get(api.services.get.path, async (req, res) => {
    const service = await storage.getService(Number(req.params.id));
    if (!service) return res.status(404).json({ message: "Not found" });
    res.json(service);
  });
  app.post(api.services.create.path, async (req, res) => {
    try {
      const input = api.services.create.input.parse(req.body);
      const service = await storage.createService(input);
      res.status(201).json(service);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });
  app.put(api.services.update.path, async (req, res) => {
    try {
      const input = api.services.update.input.parse(req.body);
      const service = await storage.updateService(Number(req.params.id), input);
      if (!service) return res.status(404).json({ message: "Not found" });
      res.json(service);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });
  app.delete(api.services.delete.path, async (req, res) => {
    await storage.deleteService(Number(req.params.id));
    res.status(204).end();
  });

  // Dashboard Metrics
  app.get(api.dashboard.metrics.path, async (req, res) => {
    const jobs = await storage.getJobs();
    const leads = await storage.getLeads();
    
    const monthlyRevenue = jobs.reduce((sum, j) => sum + (j.realPriceSold || 0), 0);
    const monthlyProfit = jobs.reduce((sum, j) => sum + (j.profit || 0), 0);
    const averageMargin = jobs.length > 0 
      ? jobs.reduce((sum, j) => sum + (j.margin || 0), 0) / jobs.length 
      : 0;
      
    const jobsInProgress = jobs.filter(j => j.status === 'In progress').length;
    const newLeads = leads.filter(l => l.status === 'New Lead').length;
    
    // simple conversion rate: jobs with closed/completed vs total leads + jobs
    const totalContacts = leads.length + jobs.length;
    const conversionRate = totalContacts > 0 ? (jobs.length / totalContacts) * 100 : 0;

    res.json({
      monthlyRevenue,
      monthlyProfit,
      averageMargin,
      jobsInProgress,
      newLeads,
      conversionRate,
      cashBalance: monthlyProfit // simplified
    });
  });

  const getLeadOperationalStatus = (leadId: number, jobs: any[], workOrders: any[]) => {
    const leadJobs = jobs.filter(job => Number(job.leadId) === leadId);
    const leadJobIds = new Set(leadJobs.map(job => Number(job.id)));
    const hasWorkOrder = workOrders.some(order => order.jobId && leadJobIds.has(Number(order.jobId)));
    if (hasWorkOrder) return "Qualified";
    if (leadJobs.length > 0) return "Proposal";
    return null;
  };

  const reconcileLeadOperationalStatus = async (leadId: number) => {
    const lead = await storage.getLead(leadId);
    if (!lead) return null;

    const [jobs, workOrders] = await Promise.all([storage.getJobs(), storage.getWorkOrders()]);
    const operationalStatus = getLeadOperationalStatus(leadId, jobs, workOrders);
    if (!operationalStatus || lead.status === operationalStatus) return lead;
    return storage.updateLead(leadId, { status: operationalStatus });
  };

  const reconcileAllLeadOperationalStatuses = async () => {
    const [leads, jobs, workOrders] = await Promise.all([storage.getLeads(), storage.getJobs(), storage.getWorkOrders()]);
    const updatedLeads = [];

    for (const lead of leads) {
      const operationalStatus = getLeadOperationalStatus(lead.id, jobs, workOrders);
      if (operationalStatus && lead.status !== operationalStatus) {
        updatedLeads.push(await storage.updateLead(lead.id, { status: operationalStatus }) || lead);
      } else {
        updatedLeads.push(lead);
      }
    }

    return updatedLeads;
  };

  const updateLeadForJobFlow = async (job: any) => {
    if (job?.leadId) await reconcileLeadOperationalStatus(Number(job.leadId));
  };

  const updateLeadForWorkOrderFlow = async (workOrder: any) => {
    if (!workOrder?.jobId) return;
    const job = await storage.getJob(Number(workOrder.jobId));
    if (job?.leadId) await reconcileLeadOperationalStatus(Number(job.leadId));
  };

  const normalizeFlowText = (value: unknown) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const parseJobPrimaryContact = (job: any) => {
    try {
      const contacts = JSON.parse(job?.clientes || "[]");
      const contact = Array.isArray(contacts) ? contacts[0] : null;
      return {
        phone: contact?.telefone || "",
        address: [contact?.endereco, contact?.cidade].filter(Boolean).join(", "),
      };
    } catch {
      return { phone: "", address: "" };
    }
  };

  const ensureJobCustomerRelations = async (input: any) => {
    const result = { ...input };
    const contact = parseJobPrimaryContact(input);
    const normalizedName = normalizeFlowText(input.clientName);

    if (!result.clientId && normalizedName) {
      const existingClient = (await storage.getClients()).find(client =>
        normalizeFlowText(client.name) === normalizedName
      );
      const client = existingClient || await storage.createClient({
        name: input.clientName,
        phone: contact.phone || null,
        address: contact.address || null,
        notes: "Criado automaticamente pelo fluxo de orçamento",
      });
      result.clientId = client.id;
    }

    if (!result.leadId && normalizedName) {
      const normalizedPhone = String(contact.phone || "").replace(/\D/g, "");
      const existingLead = (await storage.getLeads()).find(lead =>
        normalizeFlowText(lead.name) === normalizedName &&
        (!normalizedPhone || String(lead.phone || "").replace(/\D/g, "") === normalizedPhone)
      );
      const lead = existingLead || await storage.createLead({
        name: input.clientName,
        phone: contact.phone || null,
        source: "Orçamento ERP",
        status: "Proposal",
        notes: "Criado automaticamente pelo fluxo de orçamento",
      });
      result.leadId = lead.id;
    }

    return result;
  };

  const buildWorkOrderMaterials = async (job: any) => {
    let serviceItems: any[] = [];
    try { serviceItems = JSON.parse(job.serviceItems || "[]"); } catch {}
    if (!Array.isArray(serviceItems)) serviceItems = [];

    const [services, inventoryItems] = await Promise.all([storage.getServices(), storage.getInventoryItems()]);
    const materials = new Map<number, any>();
    for (const item of serviceItems) {
      const service = services.find(candidate => normalizeFlowText(candidate.name) === normalizeFlowText(item.name));
      let configuredMaterials: any[] = [];
      try { configuredMaterials = JSON.parse(service?.serviceMaterials || "[]"); } catch {}
      for (const material of configuredMaterials) {
        const inventoryId = Number(material.inventoryId);
        if (!inventoryId) continue;
        const area = Number(item.area) || 0;
        const quantity = material.unit === "per_kg"
          ? Math.ceil((area * (Number(material.kilosPerM2) || 0)) / (Number(material.weightPerUnit) || 1))
          : material.unit === "per_m2"
            ? Number(material.quantity || 0) * area
            : Number(material.quantity || 0);
        const current = materials.get(inventoryId);
        const inventoryItem = inventoryItems.find(candidate => candidate.id === inventoryId);
        materials.set(inventoryId, {
          inventoryId,
          name: material.name || inventoryItem?.name || `Material #${inventoryId}`,
          quantity: (current?.quantity || 0) + quantity,
          unit: material.unit || "fixed",
          inventoryUnit: inventoryItem?.unit || "unid",
        });
      }
    }

    return {
      serviceItems,
      materialsNeeded: Array.from(materials.values()).map(material => ({
        ...material,
        quantity: Math.ceil(material.quantity),
      })),
    };
  };

  const mapJobStatusToWorkOrder = (status: string) => {
    const normalized = normalizeFlowText(status);
    if (normalized.includes("conclu") || normalized.includes("fatur")) return "Concluída";
    if (normalized.includes("progres") || normalized.includes("andamento")) return "Em Andamento";
    if (normalized.includes("agend")) return "Agendada";
    return "Planejada";
  };

  const ensureObraRecordForWorkOrder = async (order: any, job?: any) => {
    const records = await storage.getObraRegistros();
    const existing = records.find(record =>
      Number(record.workOrderId) === Number(order.id) ||
      (!record.workOrderId && job?.id && Number(record.jobId) === Number(job.id))
    );
    if (existing?.workOrderId) return existing;
    const scheduledDate = order.scheduledDate ? new Date(order.scheduledDate) : new Date();
    const data = {
      tipo: existing?.tipo || "antes",
      nomeObra: existing?.nomeObra || `OS #${order.id} - ${order.clientName}`,
      enderecoObra: order.address || existing?.enderecoObra || "Endereço pendente de confirmação",
      nomeResponsavel: existing?.nomeResponsavel || order.clientName,
      nomeEquipe: order.teamAssigned || existing?.nomeEquipe || "A definir",
      dataInicio: existing?.dataInicio || new Date().toISOString().slice(0, 10),
      dataPrevisaoTermino: existing?.dataPrevisaoTermino || scheduledDate.toISOString().slice(0, 10),
      descricaoProblema: existing?.descricaoProblema || job?.inspectionNotes || order.notes || "Conforme Ordem de Serviço",
      tipoServico: existing?.tipoServico || order.serviceType,
      fotos: existing?.fotos || "[]",
      jobId: job?.id || order.jobId || null,
      workOrderId: order.id,
      status: existing?.status || "enviado",
    };
    return existing
      ? storage.updateObraRegistro(existing.id, data)
      : storage.createObraRegistro(data);
  };

  const ensureWorkOrderFlowForJob = async (job: any) => {
    const normalizedStatus = normalizeFlowText(job?.status);
    const statusConfig = (await storage.getJobStatuses()).find(status =>
      normalizeFlowText(status.name) === normalizedStatus
    );
    const operationalStatuses = ["aprovado", "aprovada", "agendada", "agendado", "em progresso", "em andamento", "concluida", "concluido", "faturada", "faturado"];
    if (!statusConfig?.generateOs && !operationalStatuses.includes(normalizedStatus)) return null;

    const existingOrder = (await storage.getWorkOrders()).find(order => Number(order.jobId) === Number(job.id));
    const contact = parseJobPrimaryContact(job);
    const { serviceItems, materialsNeeded } = await buildWorkOrderMaterials(job);
    const scheduledDate = job.executionDeadline ? new Date(job.executionDeadline) : new Date();
    const orderInput = {
      jobId: job.id,
      clientId: job.clientId || null,
      clientName: job.clientName,
      address: contact.address || "Endereço pendente de confirmação",
      serviceType: job.serviceType,
      materialsNeeded: materialsNeeded.length ? JSON.stringify(materialsNeeded) : null,
      selectedServices: serviceItems.length ? JSON.stringify(serviceItems.map(item => item.name)) : null,
      scheduledDate,
      status: mapJobStatusToWorkOrder(job.status),
      notes: `OS vinculada ao orçamento #${String(job.orcamentoNumero ?? job.id).padStart(4, "0")}`,
    };
    const order = existingOrder
      ? await storage.updateWorkOrder(existingOrder.id, orderInput)
      : await storage.createWorkOrder(orderInput);
    if (!order) return null;

    const obraRecords = await storage.getObraRegistros();
    const existingObra = obraRecords.find(record =>
      Number(record.workOrderId) === Number(order.id) ||
      (!record.workOrderId && Number(record.jobId) === Number(job.id))
    );
    const forecast = scheduledDate.toISOString().slice(0, 10);
    const obraInput = {
      tipo: existingObra?.tipo || "antes",
      nomeObra: `OS #${order.id} - ${job.clientName}`,
      enderecoObra: contact.address || "Endereço pendente de confirmação",
      nomeResponsavel: job.clientName,
      nomeEquipe: existingObra?.nomeEquipe || "A definir",
      dataInicio: existingObra?.dataInicio || new Date().toISOString().slice(0, 10),
      dataPrevisaoTermino: forecast,
      descricaoProblema: job.inspectionNotes || "Conforme orçamento aprovado",
      tipoServico: job.serviceType,
      fotos: existingObra?.fotos || "[]",
      jobId: job.id,
      workOrderId: order.id,
      status: existingObra?.status || "enviado",
    };
    if (existingObra) await storage.updateObraRegistro(existingObra.id, obraInput);
    else await storage.createObraRegistro(obraInput);
    await updateLeadForWorkOrderFlow(order);
    return order;
  };

  // Leads
  app.get(api.leads.list.path, async (req, res) => {
    const leads = await reconcileAllLeadOperationalStatuses();
    res.json(leads);
  });
  app.post(api.leads.create.path, async (req, res) => {
    try {
      const input = api.leads.create.input.parse(req.body);
      const lead = await storage.createLead(input);
      res.status(201).json(lead);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });
  app.put(api.leads.update.path, async (req, res) => {
    try {
      const input = api.leads.update.input.parse(req.body);
      const lead = await storage.updateLead(Number(req.params.id), input);
      if (!lead) return res.status(404).json({ message: "Not found" });
      res.json(lead);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });
  app.delete(api.leads.delete.path, async (req, res) => {
    await storage.deleteLead(Number(req.params.id));
    res.status(204).end();
  });

  // Jobs
  app.get(api.jobs.list.path, async (req, res) => {
    const jobs = await storage.getJobs();
    res.json(jobs);
  });
  app.get(api.jobs.get.path, async (req, res) => {
    const job = await storage.getJob(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Not found" });
    res.json(job);
  });
  app.post(api.jobs.create.path, async (req, res) => {
    try {
      const input = api.jobs.create.input.parse(req.body);
      const relatedInput = await ensureJobCustomerRelations(input);
      const job = await storage.createJob(relatedInput);
      await updateLeadForJobFlow(job);
      await ensureWorkOrderFlowForJob(job);
      res.status(201).json(job);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });
  app.put(api.jobs.update.path, async (req, res) => {
    try {
      const input = api.jobs.update.input.parse(req.body);
      const previousJob = await storage.getJob(Number(req.params.id));
      const relations = await ensureJobCustomerRelations({ ...previousJob, ...input });
      const job = await storage.updateJob(Number(req.params.id), {
        ...input,
        clientId: relations.clientId,
        leadId: relations.leadId,
      });
      if (!job) return res.status(404).json({ message: "Not found" });
      await updateLeadForJobFlow(job);
      if (previousJob?.leadId && previousJob.leadId !== job.leadId) {
        await reconcileLeadOperationalStatus(Number(previousJob.leadId));
      }
      await ensureWorkOrderFlowForJob(job);
      res.json(job);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });
  app.delete(api.jobs.delete.path, async (req, res) => {
    const job = await storage.getJob(Number(req.params.id));
    await storage.deleteJob(Number(req.params.id));
    if (job?.leadId) await reconcileLeadOperationalStatus(Number(job.leadId));
    res.status(204).end();
  });

  // Work Orders
  app.get(api.workOrders.list.path, async (req, res) => {
    const orders = await storage.getWorkOrders();
    res.json(orders);
  });
  app.get(api.workOrders.get.path, async (req, res) => {
    const order = await storage.getWorkOrder(Number(req.params.id));
    res.json(order);
  });
  app.post(api.workOrders.create.path, async (req, res) => {
    const existingOrder = req.body.jobId
      ? (await storage.getWorkOrders()).find(candidate => Number(candidate.jobId) === Number(req.body.jobId))
      : null;
    const order = existingOrder || await storage.createWorkOrder(req.body);
    await updateLeadForWorkOrderFlow(order);
    if (order?.jobId) {
      const job = await storage.getJob(Number(order.jobId));
      if (job) await ensureWorkOrderFlowForJob(job);
      await ensureObraRecordForWorkOrder(order, job);
    } else {
      await ensureObraRecordForWorkOrder(order);
    }
    res.status(201).json(order);
  });
  app.put(api.workOrders.update.path, async (req, res) => {
    const previousOrder = await storage.getWorkOrder(Number(req.params.id));
    const order = await storage.updateWorkOrder(Number(req.params.id), req.body);
    if (order) await updateLeadForWorkOrderFlow(order);
    if (previousOrder?.jobId && previousOrder.jobId !== order?.jobId) {
      await updateLeadForWorkOrderFlow(previousOrder);
    }
    if (order) {
      const job = order.jobId ? await storage.getJob(Number(order.jobId)) : undefined;
      await ensureObraRecordForWorkOrder(order, job);
    }
    res.json(order);
  });
  // PATCH for partial updates (used by RegistroObra page)
  app.patch("/api/work-orders/:id", requireAuth, async (req, res) => {
    try {
      const order = await storage.updateWorkOrder(Number(req.params.id), req.body);
      if (!order) return res.status(404).json({ message: "Não encontrado" });
      await updateLeadForWorkOrderFlow(order);
      res.json(order);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete(api.workOrders.delete.path, async (req, res) => {
    const order = await storage.getWorkOrder(Number(req.params.id));
    await storage.deleteWorkOrder(Number(req.params.id));
    if (order) await updateLeadForWorkOrderFlow(order);
    res.status(204).end();
  });

  // ── Finalizar Obra: mark Concluída + auto-create Garantia ────────────────
  const extractPhoneFromJobContacts = (job: any) => {
    if (!job?.clientes) return "";
    try {
      const contacts = JSON.parse(job.clientes);
      if (!Array.isArray(contacts)) return "";
      return contacts.find((contact: any) => contact?.telefone)?.telefone || "";
    } catch {
      return "";
    }
  };

  const resolveWorkOrderCustomerContext = async (workOrder: any) => {
    const job = workOrder?.jobId ? await storage.getJob(Number(workOrder.jobId)) : null;
    const directClient = workOrder?.clientId ? await storage.getClient(Number(workOrder.clientId)) : null;
    const jobClient = job?.clientId ? await storage.getClient(Number(job.clientId)) : null;
    const lead = job?.leadId ? await storage.getLead(Number(job.leadId)) : null;
    const client = directClient || jobClient;
    const clientPhone = client?.phone || extractPhoneFromJobContacts(job) || lead?.phone || null;

    return {
      job,
      lead,
      client,
      clientName: workOrder?.clientName || job?.clientName || client?.name || lead?.name || "Cliente",
      clientPhone,
      serviceType: workOrder?.serviceType || job?.serviceType || "Serviço",
    };
  };

  const ensurePostSaleRecordsForWorkOrder = async (workOrder: any, warranty: any, completedDate: string) => {
    const context = await resolveWorkOrderCustomerContext(workOrder);
    const originNote = `Origem: POS_VENDA_AUTOMATICO | OS #${workOrder.id}${warranty?.id ? ` | Garantia #${warranty.id}` : ""}`;

    const npsResponses = await storage.getNpsResponses();
    const existingNps = npsResponses.find((item: any) => Number(item.workOrderId) === Number(workOrder.id));
    const nps = existingNps || await storage.createNpsResponse({
      workOrderId: workOrder.id,
      jobId: workOrder.jobId || null,
      clientName: context.clientName,
      clientPhone: context.clientPhone,
      sentAt: null,
      respondedAt: null,
      score: null,
      comment: originNote,
      status: "pendente",
    });

    const reminders = await storage.getMaintenanceReminders();
    const existingReminder = reminders.find((item: any) => Number(item.workOrderId) === Number(workOrder.id));
    const maintenanceReminder = existingReminder || await storage.createMaintenanceReminder({
      workOrderId: workOrder.id,
      jobId: workOrder.jobId || null,
      clientName: context.clientName,
      clientPhone: context.clientPhone,
      serviceType: context.serviceType,
      completedDate,
      reminder12SentAt: null,
      reminder24SentAt: null,
      notes: `${originNote} | Lembretes sugeridos para 12 e 24 meses.`,
    });

    return { nps, maintenanceReminder };
  };

  const ensureWarrantyForWorkOrder = async (workOrder: any, startDate: string, endDate: string, today: Date) => {
    const context = await resolveWorkOrderCustomerContext(workOrder);
    const warranties = await storage.getWarranties();
    const existingWarranty = warranties.find((warranty: any) => Number(warranty.workOrderId) === Number(workOrder.id));
    const notes = `Gerada automaticamente ao finalizar OS #${workOrder.id} em ${today.toLocaleDateString("pt-BR")} | Origem: OS_FINALIZADA`;

    if (existingWarranty) {
      const updatedWarranty = await storage.updateWarranty(existingWarranty.id, {
        jobId: existingWarranty.jobId || workOrder.jobId || null,
        clientName: existingWarranty.clientName || context.clientName,
        clientPhone: existingWarranty.clientPhone || context.clientPhone,
        serviceType: existingWarranty.serviceType || context.serviceType,
        warrantyMonths: existingWarranty.warrantyMonths || 12,
        startDate: existingWarranty.startDate || startDate,
        endDate: existingWarranty.endDate || endDate,
        status: existingWarranty.status || "ativa",
        notes: existingWarranty.notes || notes,
      } as any);
      return updatedWarranty || existingWarranty;
    }

    return storage.createWarranty({
      workOrderId: workOrder.id,
      jobId: workOrder.jobId || null,
      clientName: context.clientName,
      clientPhone: context.clientPhone,
      serviceType: context.serviceType,
      warrantyMonths: 12,
      startDate,
      endDate,
      status: "ativa",
      notes,
    });
  };

  app.post("/api/work-orders/:id/finalizar", requireAuth, async (req, res) => {
    try {
      const woId = Number(req.params.id);
      const wo = await storage.getWorkOrder(woId);
      if (!wo) return res.status(404).json({ message: "OS não encontrada" });

      // 1. Mark as Concluída
      await storage.updateWorkOrder(woId, { status: "Concluída" });

      const today = new Date();
      const startDate = today.toISOString().split("T")[0];
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 12);
      const endDateStr = endDate.toISOString().split("T")[0];

      const warranty = await ensureWarrantyForWorkOrder(wo, startDate, endDateStr, today);
      const postSale = await ensurePostSaleRecordsForWorkOrder(wo, warranty, startDate);

      res.json({ success: true, warranty, postSale });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Inventory
  app.get(api.inventory.list.path, async (req, res) => {
    const items = await storage.getInventoryItems();
    res.json(items);
  });
  app.post(api.inventory.create.path, async (req, res) => {
    try {
      const input = normalizeInventoryPricingPayload(api.inventory.create.input.parse(req.body));
      const item = await storage.createInventoryItem(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });
  app.put(api.inventory.update.path, async (req, res) => {
    try {
      const current = (await storage.getInventoryItems()).find(item => Number(item.id) === Number(req.params.id));
      const input = normalizeInventoryPricingPayload(api.inventory.update.input.parse(req.body), current || {});
      const item = await storage.updateInventoryItem(Number(req.params.id), input);
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });
  app.delete(api.inventory.delete.path, async (req, res) => {
    await storage.deleteInventoryItem(Number(req.params.id));
    res.status(204).end();
  });
  app.get("/api/inventory-movements", async (req, res) => {
    const { inventoryId } = req.query;
    if (inventoryId) {
      const movs = await storage.getInventoryMovementsByProduct(Number(inventoryId));
      return res.json(movs);
    }
    const movs = await storage.getInventoryMovements();
    res.json(movs);
  });
  app.post("/api/inventory-movements", async (req, res) => {
    try {
      const { inventoryId, productName, type, quantity, date, month, notes } = req.body;
      if (!inventoryId || !type || !quantity) return res.status(400).json({ message: "inventoryId, type e quantity são obrigatórios" });
      const today = date || new Date().toISOString().split("T")[0];
      const mov = await storage.createInventoryMovement({
        inventoryId: Number(inventoryId), productName, type, quantity: Number(quantity), date: today,
        month: month || new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" }), notes,
      });
      res.status(201).json(mov);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  app.put("/api/inventory-movements/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { inventoryId, productName, type, quantity, date, notes } = req.body;
      if (!inventoryId || !type || !quantity || !date) return res.status(400).json({ message: "Campos obrigatórios ausentes" });
      const monthLabel = new Date(date + "T12:00:00").toLocaleString("pt-BR", { month: "long", year: "numeric" });
      const updated = await storage.updateInventoryMovement(id, {
        inventoryId: Number(inventoryId), productName, type, quantity: Number(quantity),
        date, month: monthLabel, notes,
      });
      if (!updated) return res.status(404).json({ message: "Movimentação não encontrada" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  app.delete("/api/inventory-movements/:id", async (req, res) => {
    try {
      await storage.deleteInventoryMovement(Number(req.params.id));
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  // Batch: register multiple movements in one request — each item has its own type
  app.post("/api/inventory-movements/batch", async (req, res) => {
    try {
      const { date, items, notes } = req.body as {
        date: string; notes?: string;
        items: { inventoryId: number; productName: string; quantity: number; type: string }[];
      };
      if (!date || !items?.length) return res.status(400).json({ message: "date e items são obrigatórios" });
      const monthLabel = new Date(date + "T12:00:00").toLocaleString("pt-BR", { month: "long", year: "numeric" });

      // Deduplicate by inventoryId — keep only the LAST entry per product
      const deduped = new Map<number, typeof items[0]>();
      for (const item of items) {
        const id = Number(item.inventoryId);
        if (id && item.quantity) deduped.set(id, item);
      }

      const results = [];
      for (const item of deduped.values()) {
        const qty = Number(item.quantity);
        if (!qty) continue;
        const itemType = item.type === "SAÍDA" ? "SAÍDA" : "ENTRADA";
        const mov = await storage.createInventoryMovement({
          inventoryId: Number(item.inventoryId),
          productName: item.productName,
          type: itemType,
          quantity: qty,
          date,
          month: monthLabel,
          notes,
        });
        results.push(mov);
      }
      res.status(201).json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Registro rápido de materiais a partir de anotações do celular
  app.get("/api/mobile-import/aliases", requireAuth, async (_req, res) => {
    try {
      res.json(await storage.getMobileImportAliases());
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/mobile-import/history", requireAuth, async (_req, res) => {
    try {
      res.json(await storage.getMobileImportHistory());
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/mobile-import/preview", requireAuth, async (req, res) => {
    try {
      const text = String(req.body?.text || "");
      if (!text.trim()) return res.status(400).json({ message: "Cole as anotações antes de interpretar." });
      const importYear = parseMobileImportYear(req.body?.importYear);
      const [inventoryItems, products, users, aliases] = await Promise.all([
        storage.getInventoryItems(),
        storage.getProducts(),
        storage.getUsers(),
        storage.getMobileImportAliases(),
      ]);
      const inventoryNames = new Set(inventoryItems.map((item: any) => String(item.name || "").toLowerCase()));
      const catalogCandidates = products
        .filter((product: any) => product?.name && !inventoryNames.has(String(product.name).toLowerCase()))
        .map((product: any) => ({
          id: -Number(product.id),
          productId: Number(product.id),
          name: product.name,
          type: product.category || "catalogo",
          unit: product.unit,
          quantity: 0,
          source: "product" as const,
        }));
      const hash = mobileImportHash(text, importYear);
      const duplicate = await storage.getMobileImportHistoryByHash(hash);
      const preview = buildMobileNotesPreview({
        text,
        importYear,
        inventory: [
          ...inventoryItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          unit: item.unit,
          quantity: item.quantity,
          source: "inventory" as const,
        })),
          ...catalogCandidates,
        ],
        users: users.map((user: any) => ({
          id: user.id,
          username: user.username,
          fullName: user.fullName || user.name,
          jobTitle: user.jobTitle,
          role: user.role,
        })),
        aliases,
      });
      res.json({ ...preview, hash, duplicate: Boolean(duplicate), duplicateRecord: duplicate || null });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/mobile-import/apply", requireAuth, async (req, res) => {
    try {
      const sessionUser = await storage.getUser(Number(req.session.userId));
      if (!sessionUser) return res.status(401).json({ message: "Não autenticado" });
      const text = String(req.body?.text || "");
      if (!text.trim()) return res.status(400).json({ message: "Texto original obrigatório para confirmar a importação." });
      const importYear = parseMobileImportYear(req.body?.importYear);
      const hash = mobileImportHash(text, importYear);
      const existingHistory = await storage.getMobileImportHistoryByHash(hash);
      if (existingHistory) return res.status(409).json({ message: "Esta anotação já foi importada.", history: existingHistory });

      const rows = normalizeMobileImportRows(req.body?.rows);
      assertMobileImportRowsReady(rows);
      const activeRows = rows.filter(row => !row.ignored);
      if (!activeRows.length) return res.status(400).json({ message: "Nenhum item confirmado para importar." });

      const [inventoryItems, users, existingAliases] = await Promise.all([
        storage.getInventoryItems(),
        storage.getUsers(),
        storage.getMobileImportAliases(),
      ]);
      const inventoryById = new Map(inventoryItems.map((item: any) => [Number(item.id), item]));
      const usersById = new Map(users.map((user: any) => [Number(user.id), user]));

      const movements: any[] = [];
      const withdrawals: any[] = [];
      const withdrawalGroups = new Map<string, {
        user: any;
        date: string;
        items: Array<{ withdrawalId: number; inventoryId: number; productName: string; unit: string; quantity: number }>;
        rawTexts: string[];
      }>();

      for (const row of activeRows) {
        const inventoryItem = inventoryById.get(Number(row.inventoryId));
        if (!inventoryItem) continue;
        const movementDate = `${row.date}T12:00:00`;
        const month = MONTHS_PT_BR[new Date(movementDate).getMonth()];
        const currentStock = Math.max(0, Number(inventoryItem.quantity) || 0);
        const stockWarning = row.type !== "entrada" && row.quantity > currentStock
          ? ` | ALERTA: estoque insuficiente no momento do registro; disponível ${currentStock}, registrado ${row.quantity}`
          : "";
        if (row.type === "entrada" || row.type === "saida") {
          const movement = await storage.createInventoryMovement({
            inventoryId: Number(inventoryItem.id),
            productName: inventoryItem.name,
            type: row.type === "entrada" ? "ENTRADA" : "SAÍDA",
            quantity: row.quantity,
            date: row.date,
            month,
            notes: `Registro Rapido #${hash.slice(0, 12)} | ${row.rawText}${stockWarning}`,
          });
          movements.push(movement);
          continue;
        }

        const responsible = usersById.get(Number(row.userId));
        if (!responsible) throw new Error(`Funcionário não encontrado para ${row.rawEmployee || row.rawText}`);
        const key = `${row.date}:${responsible.id}:${row.rawText}`;
        const group = withdrawalGroups.get(key) || {
          user: responsible,
          date: row.date,
          items: [],
          rawTexts: [],
        };
        group.items.push({
          withdrawalId: 0,
          inventoryId: Number(inventoryItem.id),
          productName: inventoryItem.name,
          unit: inventoryItem.unit || "unid",
          quantity: row.quantity,
        });
        if (!group.rawTexts.includes(row.rawText)) group.rawTexts.push(row.rawText);
        withdrawalGroups.set(key, group);
      }

      for (const group of withdrawalGroups.values()) {
        const hasReturnables = hasReturnableMaterialItems(group.items.map(item => ({
          productName: item.productName,
          type: inventoryById.get(Number(item.inventoryId))?.type,
        })));
        const withdrawal = await storage.createMaterialWithdrawal({
          userId: Number(group.user.id),
          username: group.user.username,
          workOrderId: null,
          jobId: null,
          clientName: null,
          withdrawalDate: group.date,
          status: hasReturnables ? "pendente" : "consumido",
          withdrawalPhoto: null,
          withdrawalSignature: null,
          notes: `Importado via Registro Rapido #${hash.slice(0, 12)} | ${group.rawTexts.join(" | ")}`,
          returnPhoto: null,
          returnSignature: null,
          returnNotes: null,
        }, group.items);
        withdrawals.push(withdrawal);

        const month = MONTHS_PT_BR[new Date(`${group.date}T12:00:00`).getMonth()];
        for (const item of withdrawal.items) {
          const movement = await storage.createInventoryMovement({
            inventoryId: item.inventoryId,
            productName: item.productName,
            type: "SAÍDA",
            quantity: item.quantity,
            date: group.date,
            month,
            notes: `Registro Rapido #${hash.slice(0, 12)} | Retirada #${withdrawal.id} | Responsavel: ${group.user.username}${Number(inventoryById.get(Number(item.inventoryId))?.quantity || 0) < Number(item.quantity || 0) ? " | ALERTA: estoque insuficiente no momento do registro" : ""}`,
          });
          movements.push(movement);
        }
      }

      const aliasesToSave = Array.isArray(req.body?.aliasesToSave) ? req.body.aliasesToSave : [];
      const savedAliases = [];
      for (const aliasInput of aliasesToSave) {
        const alias = String(aliasInput?.alias || "").trim();
        const user = usersById.get(Number(aliasInput?.userId));
        if (!alias || !user) continue;
        const existing = existingAliases.find((item: any) => String(item.alias || "").trim().toLowerCase() === alias.toLowerCase());
        if (existing) {
          savedAliases.push(await storage.updateMobileImportAlias(Number(existing.id), {
            alias,
            userId: Number(user.id),
            username: user.username,
            createdByUserId: Number(sessionUser.id),
            createdByUsername: sessionUser.username,
          }));
        } else {
          savedAliases.push(await storage.createMobileImportAlias({
            alias,
            userId: Number(user.id),
            username: user.username,
            createdByUserId: Number(sessionUser.id),
            createdByUsername: sessionUser.username,
          }));
        }
      }

      const summary = {
        ...summarizeMobileRows(rows),
        importYear,
        movimentosCriados: movements.length,
        retiradasCriadas: withdrawals.length,
        aliasesSalvos: savedAliases.filter(Boolean).length,
        alertasEstoqueInsuficiente: activeRows.filter(row => row.warnings.some(warning => warning.toLowerCase().includes("estoque insuficiente"))).length,
      };
      const history = await storage.createMobileImportHistory({
        hash,
        importedByUserId: Number(sessionUser.id),
        importedByUsername: sessionUser.username,
        sourceText: text,
        summary: JSON.stringify(summary),
        status: "aplicado",
      });

      res.status(201).json({ hash, summary, movements, withdrawals, savedAliases: savedAliases.filter(Boolean), history });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const paymentTransactionMarker = (paymentId: number) => `Origem: PAGAMENTO | Payment #${paymentId}`;

  const isCompletedPayment = (payment: any) => String(payment?.status || "").toLowerCase() === "completed";

  const getJobTotalValue = (job: any) => Number(job?.realPriceSold || job?.calculatedPrice || 0);

  const recalculateJobPaymentStatus = async (jobId: number) => {
    const job = await storage.getJob(jobId);
    if (!job) return null;

    const jobPayments = await storage.getPaymentsByJobId(jobId);
    const totalPaid = jobPayments
      .filter(isCompletedPayment)
      .reduce((sum, payment: any) => sum + Number(payment.amount || 0), 0);
    const totalValue = getJobTotalValue(job);
    const newStatus = totalValue > 0 && totalPaid >= totalValue
      ? "paid"
      : totalPaid > 0
        ? "partial"
        : "pending";

    await storage.updateJob(job.id, { paymentStatus: newStatus });
    return { jobId, totalPaid, totalValue, paymentStatus: newStatus };
  };

  const removePaymentFinancialTransactions = async (paymentId: number) => {
    const marker = paymentTransactionMarker(paymentId);
    const currentTransactions = await storage.getTransactions();
    const linkedTransactions = currentTransactions.filter((transaction: any) =>
      String(transaction.description || "").includes(marker)
    );

    for (const transaction of linkedTransactions) {
      await storage.deleteTransaction(transaction.id);
    }

    return linkedTransactions.length;
  };

  const syncPaymentWithFinancialTransactions = async (payment: any) => {
    if (!payment?.id) return null;

    if (!isCompletedPayment(payment)) {
      await removePaymentFinancialTransactions(payment.id);
      return { paymentId: payment.id, createdTransaction: null };
    }

    const job = await storage.getJob(Number(payment.jobId));
    const marker = paymentTransactionMarker(payment.id);
    const description = [
      marker,
      `Job #${payment.jobId}`,
      `Cliente: ${payment.clientName}`,
      `Metodo: ${payment.paymentMethod}`,
      job?.orcamentoNumero ? `Orcamento #${job.orcamentoNumero}` : null,
    ].filter(Boolean).join(" | ");

    const currentTransactions = await storage.getTransactions();
    const linkedTransactions = currentTransactions.filter((transaction: any) =>
      String(transaction.description || "").includes(marker)
    );
    const existing = linkedTransactions[0];
    const isAlreadySynced = linkedTransactions.length === 1 &&
      existing.type === "inflow" &&
      existing.category === "Pagamento de orçamento" &&
      Number(existing.amount || 0) === Number(payment.amount || 0) &&
      existing.description === description;

    if (isAlreadySynced) {
      return { paymentId: payment.id, createdTransaction: existing };
    }

    await removePaymentFinancialTransactions(payment.id);

    const createdTransaction = await storage.createTransaction({
      type: "inflow",
      category: "Pagamento de orçamento",
      amount: Number(payment.amount || 0),
      description,
    } as any);

    return { paymentId: payment.id, createdTransaction };
  };

  const reconcileAllPaymentsWithFinance = async () => {
    const payments = await storage.getPayments();
    const touchedJobIds = new Set<number>();

    for (const payment of payments as any[]) {
      await syncPaymentWithFinancialTransactions(payment);
      if (payment.jobId) touchedJobIds.add(Number(payment.jobId));
    }

    for (const jobId of touchedJobIds) {
      await recalculateJobPaymentStatus(jobId);
    }

    return { payments: payments.length, jobs: touchedJobIds.size };
  };

  // Transactions
  app.get(api.transactions.list.path, async (req, res) => {
    await reconcileAllPaymentsWithFinance();
    const ts = await storage.getTransactions();
    res.json(ts);
  });
  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = api.transactions.create.input.parse(req.body);
      const t = await storage.createTransaction(input);
      res.status(201).json(t);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // Settings
  app.get(api.settings.list.path, async (req, res) => {
    const s = await storage.getSettings();
    res.json(s);
  });
  app.post(api.settings.updateBulk.path, async (req, res) => {
    try {
      const { settings: items } = api.settings.updateBulk.input.parse(req.body);
      for (const item of items) {
        await storage.updateSetting(item.key, item.value);
      }
      const updated = await storage.getSettings();
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // Payments
  app.get("/api/payments", async (req, res) => {
    try {
      await reconcileAllPaymentsWithFinance();
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const payment = await storage.createPayment(req.body);
      await syncPaymentWithFinancialTransactions(payment);
      await recalculateJobPaymentStatus(payment.jobId);
      res.json(payment);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.patch("/api/payments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const previousPayment = await storage.getPayment(id);
      if (!previousPayment) return res.status(404).json({ message: "Pagamento nao encontrado" });
      const payment = await storage.updatePayment(id, req.body);
      if (!payment) return res.status(404).json({ message: "Pagamento nao encontrado" });
      await syncPaymentWithFinancialTransactions(payment);
      await recalculateJobPaymentStatus(payment.jobId);
      if (previousPayment.jobId !== payment.jobId) {
        await recalculateJobPaymentStatus(previousPayment.jobId);
      }
      res.json(payment);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete("/api/payments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const previousPayment = await storage.getPayment(id);
      if (!previousPayment) return res.status(404).json({ message: "Pagamento nao encontrado" });
      await removePaymentFinancialTransactions(id);
      await storage.deletePayment(id);
      await recalculateJobPaymentStatus(previousPayment.jobId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // Products / Catalog
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const product = await storage.createProduct(normalizeProductPricingPayload(req.body));
      res.json(product);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const current = await storage.getProduct(parseInt(req.params.id));
      const product = await storage.updateProduct(parseInt(req.params.id), normalizeProductPricingPayload(req.body, current || {}));
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await storage.deleteProduct(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // Job Tracking
  app.get("/api/job-tracking/:workOrderId", async (req, res) => {
    try {
      const tracking = await storage.getJobTracking(parseInt(req.params.workOrderId));
      res.json(tracking || null);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/job-tracking", async (req, res) => {
    try {
      const tracking = await storage.createJobTracking(req.body);
      res.json(tracking);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.patch("/api/job-tracking/:id", async (req, res) => {
    try {
      const tracking = await storage.updateJobTracking(parseInt(req.params.id), req.body);
      res.json(tracking);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // Priority Rules
  app.get("/api/priority-rules", async (req, res) => {
    try {
      const rules = await storage.getPriorityRules();
      res.json(rules || {});
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.patch("/api/priority-rules", async (req, res) => {
    try {
      const updated = await storage.updatePriorityRules(req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // Cost Config
  app.get("/api/cost-config", async (req, res) => {
    try {
      let config = await storage.getCostConfig();
      if (!config) {
        config = await storage.updateCostConfig({
          laborDailyRate: 800,
          laborHourlyRate: 100,
          transportCostPerKm: 1.5,
          transportMinimumCost: 50,
          minMarginPercent: 0.30,
          idealMarginPercent: 0.40,
          alertMarginPercent: 0.30,
          prohibitedMarginPercent: 0.25,
          minimumServiceValue: 1000,
        });
      }
      res.json(config);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.patch("/api/cost-config", async (req, res) => {
    try {
      const parsed = insertCostConfigSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: parsed.error.flatten().fieldErrors });
      }
      const updated = await storage.updateCostConfig(parsed.data);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // Obra Registros
  app.get("/api/obra-registros", async (req, res) => {
    try {
      const tipo = req.query.tipo as string | undefined;
      const registros = tipo
        ? await storage.getObraRegistrosByTipo(tipo)
        : await storage.getObraRegistros();
      res.json(registros);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.get("/api/obra-registros/:id", async (req, res) => {
    try {
      const registro = await storage.getObraRegistro(Number(req.params.id));
      if (!registro) return res.status(404).json({ message: "Registro não encontrado" });
      res.json(registro);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/obra-registros", async (req, res) => {
    try {
      const created = await storage.createObraRegistro(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.patch("/api/obra-registros/:id", async (req, res) => {
    try {
      const updated = await storage.updateObraRegistro(Number(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: "Registro não encontrado" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete("/api/obra-registros/:id", async (req, res) => {
    try {
      await storage.deleteObraRegistro(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // Job Statuses (custom WhatsApp messages)
  const DEFAULT_JOB_STATUSES = [
    { name: "Lead",        sortOrder: 1, includePdf: true,  generateOs: false, message: "Olá {cliente}! Segue o orçamento solicitado da IMPPEL. Qualquer dúvida estou à disposição.\n\n📋 Orçamento Nº {numero} — IMPPEL Impermeabilizações" },
    { name: "Estimando",   sortOrder: 2, includePdf: true,  generateOs: false, message: "Olá {cliente}! Segue o orçamento solicitado da IMPPEL. Qualquer dúvida estou à disposição.\n\n📋 Orçamento Nº {numero} — IMPPEL Impermeabilizações" },
    { name: "Aprovado",    sortOrder: 3, includePdf: true,  generateOs: true,  message: "Olá {cliente}! Seu orçamento foi aprovado. Segue o documento oficial para sua análise.\n\n📋 Orçamento Nº {numero} — IMPPEL Impermeabilizações" },
    { name: "Agendada",    sortOrder: 4, includePdf: true,  generateOs: false, message: "Olá {cliente}! Aqui está o orçamento atualizado. Podemos agendar a execução?\n\n📋 Orçamento Nº {numero} — IMPPEL Impermeabilizações" },
    { name: "Em Progresso",sortOrder: 5, includePdf: false, generateOs: false, message: "Olá {cliente}! Aqui está o orçamento atualizado. Podemos agendar a execução?\n\n📋 Orçamento Nº {numero} — IMPPEL Impermeabilizações" },
    { name: "Concluída",   sortOrder: 6, includePdf: true,  generateOs: false, message: "Olá {cliente}! Segue o orçamento final da obra realizada. Obrigado pela confiança!\n\n📋 Orçamento Nº {numero} — IMPPEL Impermeabilizações" },
    { name: "Faturada",    sortOrder: 7, includePdf: false, generateOs: false, message: "Olá {cliente}! Segue o orçamento final da obra realizada. Obrigado pela confiança!\n\n📋 Orçamento Nº {numero} — IMPPEL Impermeabilizações" },
  ];

  app.get("/api/job-statuses", async (req, res) => {
    try {
      let list = await storage.getJobStatuses();
      // Seed defaults if empty
      if (list.length === 0) {
        for (const s of DEFAULT_JOB_STATUSES) {
          await storage.createJobStatus(s as any);
        }
        list = await storage.getJobStatuses();
      }
      res.json(list);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.post("/api/job-statuses", async (req, res) => {
    try {
      const created = await storage.createJobStatus(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.put("/api/job-statuses/:id", async (req, res) => {
    try {
      const updated = await storage.updateJobStatus(Number(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete("/api/job-statuses/:id", async (req, res) => {
    try {
      await storage.deleteJobStatus(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // ─── Payment Methods (Formas de Pagamento) ───
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const pms = await storage.getPaymentMethods();
      res.json(pms);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/payment-methods", async (req, res) => {
    try {
      const { name, discountPercent, active, notes } = req.body;
      if (!name) return res.status(400).json({ message: "name obrigatório" });
      const pm = await storage.createPaymentMethod({ name, discountPercent: Number(discountPercent) || 0, active: active !== false, notes });
      res.status(201).json(pm);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.put("/api/payment-methods/:id", async (req, res) => {
    try {
      const { name, discountPercent, active, notes } = req.body;
      const pm = await storage.updatePaymentMethod(Number(req.params.id), { name, discountPercent: discountPercent !== undefined ? Number(discountPercent) : undefined, active, notes });
      if (!pm) return res.status(404).json({ message: "Não encontrado" });
      res.json(pm);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/payment-methods/:id", async (req, res) => {
    try {
      await storage.deletePaymentMethod(Number(req.params.id));
      res.status(204).send();
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Payment Conditions (Condições de Pagamento) ─────────────────────────────
  app.get("/api/payment-conditions", async (req, res) => {
    try { res.json(await storage.getPaymentConditions()); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/payment-conditions", async (req, res) => {
    try {
      const { name, fullText, active, sortOrder } = req.body;
      if (!name || !fullText) return res.status(400).json({ message: "name e fullText são obrigatórios" });
      const pc = await storage.createPaymentCondition({ name, fullText, active: active !== false, sortOrder: Number(sortOrder) || 0 });
      res.status(201).json(pc);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.put("/api/payment-conditions/:id", async (req, res) => {
    try {
      const { name, fullText, active, sortOrder } = req.body;
      const pc = await storage.updatePaymentCondition(Number(req.params.id), { name, fullText, active, sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined });
      if (!pc) return res.status(404).json({ message: "Não encontrado" });
      res.json(pc);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/payment-conditions/:id", async (req, res) => {
    try {
      await storage.deletePaymentCondition(Number(req.params.id));
      res.status(204).send();
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Obra Consumo Logs — per-user material consumption tracking ──────────────
  type MaterialReconciliationBucket = {
    key: string;
    inventoryId: number | null;
    name: string;
    planned: number;
    withdrawn: number;
    consumed: number;
    returned: number;
  };

  const toNumber = (value: any) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const normalizeMaterialName = (value: any) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const materialKey = (inventoryId: any, name: any) => {
    const invId = Number(inventoryId);
    if (Number.isFinite(invId) && invId > 0) return `inv:${invId}`;
    return `name:${normalizeMaterialName(name)}`;
  };

  const readJsonArray = (value: any): any[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const addMaterialAmount = (
    buckets: Map<string, MaterialReconciliationBucket>,
    input: { inventoryId?: any; name?: any; productName?: any; materialName?: any; quantity?: any },
    field: "planned" | "withdrawn" | "consumed" | "returned",
  ) => {
    const name = String(input.name || input.productName || input.materialName || "Material sem nome");
    const invId = Number(input.inventoryId);
    const key = materialKey(input.inventoryId, name);
    const nameOnlyKey = materialKey(null, name);
    let current = buckets.get(key);
    if (!current && key !== nameOnlyKey) {
      current = buckets.get(nameOnlyKey);
      if (current) {
        buckets.delete(nameOnlyKey);
        current.key = key;
      }
    }
    current = current || {
      key,
      inventoryId: Number.isFinite(invId) && invId > 0 ? invId : null,
      name,
      planned: 0,
      withdrawn: 0,
      consumed: 0,
      returned: 0,
    };
    current[field] += Math.ceil(toNumber(input.quantity));
    if (!current.inventoryId && Number.isFinite(invId) && invId > 0) current.inventoryId = invId;
    if (current.name === "Material sem nome" && name) current.name = name;
    buckets.set(key, current);
  };

  const buildWorkOrderMaterialReconciliation = async (workOrderId: number) => {
    const workOrder = await storage.getWorkOrder(workOrderId);
    if (!workOrder) return null;

    const buckets = new Map<string, MaterialReconciliationBucket>();
    for (const material of readJsonArray((workOrder as any).materialsNeeded)) {
      addMaterialAmount(buckets, {
        inventoryId: material.inventoryId,
        name: material.name || material.productName || material.materialName,
        quantity: material.quantity,
      }, "planned");
    }

    const withdrawals = (await storage.getMaterialWithdrawals()).filter((withdrawal: any) => Number(withdrawal.workOrderId) === workOrderId);
    for (const withdrawal of withdrawals) {
      for (const item of withdrawal.items || []) {
        addMaterialAmount(buckets, {
          inventoryId: item.inventoryId,
          productName: item.productName,
          quantity: item.quantity,
        }, "withdrawn");
        const returnedQuantity = Math.ceil(toNumber(item.returnedQuantity));
        if (returnedQuantity > 0) {
          addMaterialAmount(buckets, {
            inventoryId: item.inventoryId,
            productName: item.productName,
            quantity: returnedQuantity,
          }, "returned");
        }
      }
    }

    const logs = await storage.getObraConsumoLogs(workOrderId);
    for (const log of logs) {
      addMaterialAmount(buckets, {
        inventoryId: log.inventoryId,
        materialName: log.materialName,
        quantity: log.quantity,
      }, "consumed");
    }

    const items = Array.from(buckets.values())
      .map(item => {
        const availableFromWithdrawal = Math.max(item.withdrawn - item.returned, 0);
        const pending = Math.max(item.withdrawn - item.returned - item.consumed, 0);
        const directConsumed = Math.max(item.consumed - availableFromWithdrawal, 0);
        const plannedVariance = item.planned > 0 ? item.consumed - item.planned : 0;
        const status = directConsumed > 0
          ? "direct"
          : pending > 0
            ? "pending"
            : plannedVariance > 0
              ? "exceeded"
              : "ok";
        return {
          ...item,
          availableFromWithdrawal,
          pending,
          directConsumed,
          plannedVariance,
          status,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    return {
      workOrderId,
      items,
      summary: {
        planned: items.reduce((sum, item) => sum + item.planned, 0),
        withdrawn: items.reduce((sum, item) => sum + item.withdrawn, 0),
        consumed: items.reduce((sum, item) => sum + item.consumed, 0),
        returned: items.reduce((sum, item) => sum + item.returned, 0),
        pending: items.reduce((sum, item) => sum + item.pending, 0),
        directConsumed: items.reduce((sum, item) => sum + item.directConsumed, 0),
      },
      hasPending: items.some(item => item.pending > 0),
      hasDirectConsumption: items.some(item => item.directConsumed > 0),
      generatedAt: new Date().toISOString(),
    };
  };

  const getMaterialCoverageBeforeConsumption = async (workOrderId: number, inventoryId: any, materialName: string) => {
    const reconciliation = await buildWorkOrderMaterialReconciliation(workOrderId);
    const key = materialKey(inventoryId, materialName);
    const item = reconciliation?.items.find((entry: any) => entry.key === key);
    const availableFromWithdrawal = item ? Math.max(item.withdrawn - item.returned - item.consumed, 0) : 0;
    return { reconciliation, item, availableFromWithdrawal };
  };

  app.get("/api/obra-consumo-logs", requireAuth, async (req, res) => {
    try {
      const workOrderId = Number(req.query.workOrderId);
      if (!workOrderId) return res.json([]);
      const logs = await storage.getObraConsumoLogs(workOrderId);
      res.json(logs);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/work-orders/:id/material-reconciliation", requireAuth, async (req, res) => {
    try {
      const workOrderId = Number(req.params.id);
      const reconciliation = await buildWorkOrderMaterialReconciliation(workOrderId);
      if (!reconciliation) return res.status(404).json({ message: "OS nao encontrada" });
      res.json(reconciliation);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/obra-consumo-logs", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId as number;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Não autenticado" });
      const { workOrderId, serviceName, materialName, inventoryId, quantity, notes } = req.body;
      if (!workOrderId || !serviceName || !materialName || quantity == null) {
        return res.status(400).json({ message: "workOrderId, serviceName, materialName e quantity são obrigatórios" });
      }
      const ceiledQty = Math.ceil(Number(quantity));
      if (ceiledQty <= 0) return res.status(400).json({ message: "Quantidade deve ser maior que zero" });
      const { availableFromWithdrawal } = await getMaterialCoverageBeforeConsumption(Number(workOrderId), inventoryId, materialName);
      const coveredByWithdrawal = Math.min(ceiledQty, availableFromWithdrawal);
      const directStockQuantity = inventoryId ? Math.max(ceiledQty - coveredByWithdrawal, 0) : 0;
      const traceNotes = [
        coveredByWithdrawal > 0 ? `Origem: CONSUMO_OS_RECONCILIADO | Coberto por retirada: ${coveredByWithdrawal}` : "Origem: CONSUMO_DIRETO_OS",
        directStockQuantity > 0 ? `Baixa direta de estoque: ${directStockQuantity}` : "Sem baixa adicional de estoque",
        notes ? `Obs.: ${notes}` : null,
      ].filter(Boolean).join(" | ");
      const log = await storage.createObraConsumoLog({
        workOrderId: Number(workOrderId),
        serviceName,
        materialName,
        inventoryId: inventoryId ? Number(inventoryId) : null,
        quantity: ceiledQty,
        userId,
        username: user.username,
        notes: traceNotes || null,
      });
      // ── Baixa automática de estoque ───────────────────────────────────────
      if (inventoryId && directStockQuantity > 0) {
        const invId = Number(inventoryId);
        const today = new Date().toISOString().split("T")[0];
        const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
        const month = monthNames[new Date().getMonth()];
        await storage.createInventoryMovement({
          inventoryId: invId,
          productName: materialName,
          type: "SAÍDA",
          quantity: directStockQuantity,
          date: today,
          month,
          notes: `Origem: CONSUMO_DIRETO_OS | ConsumoLog #${log.id} | OS #${workOrderId} | Servico: ${serviceName} | Quantidade: ${directStockQuantity}`,
        });
      }
      res.status(201).json(log);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/obra-consumo-logs/:id", requireAuth, async (req, res) => {
    try {
      const consumoLogId = Number(req.params.id);
      const log = await storage.getObraConsumoLog(consumoLogId);
      if (log) {
        const directMovements = (await storage.getInventoryMovements()).filter((movement: any) =>
          String(movement.notes || "").includes(`ConsumoLog #${consumoLogId}`) &&
          String(movement.notes || "").includes("Origem: CONSUMO_DIRETO_OS")
        );
        for (const movement of directMovements) {
          await storage.deleteInventoryMovement(movement.id);
        }
      }
      await storage.deleteObraConsumoLog(consumoLogId);
      res.status(204).send();
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Contracts ───────────────────────────────────────────────────────────────
  app.get("/api/contracts", async (req, res) => {
    try { res.json(await storage.getContracts()); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.get("/api/contracts/:id", async (req, res) => {
    try {
      const c = await storage.getContract(Number(req.params.id));
      if (!c) return res.status(404).json({ message: "Não encontrado" });
      res.json(c);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/contracts", async (req, res) => {
    try {
      const { jobId, workOrderId, clientName, serviceType, contractText, status, valor } = req.body;
      if (!clientName) return res.status(400).json({ message: "clientName obrigatório" });
      const c = await storage.createContract({ jobId: jobId || null, workOrderId: workOrderId || null, clientName, serviceType, contractText, status: status || "gerado", valor: valor ? Number(valor) : null });
      res.status(201).json(c);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.put("/api/contracts/:id", async (req, res) => {
    try {
      const c = await storage.updateContract(Number(req.params.id), req.body);
      if (!c) return res.status(404).json({ message: "Não encontrado" });
      res.json(c);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/contracts/:id", async (req, res) => {
    try { await storage.deleteContract(Number(req.params.id)); res.status(204).send(); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Warranties ──────────────────────────────────────────────────────────────
  app.get("/api/warranties", async (req, res) => {
    try { res.json(await storage.getWarranties()); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/warranties", async (req, res) => {
    try {
      const { workOrderId, jobId, clientName, clientPhone, serviceType, warrantyMonths, startDate, endDate, status, notes } = req.body;
      if (!clientName || !serviceType || !startDate || !endDate) return res.status(400).json({ message: "Campos obrigatórios: clientName, serviceType, startDate, endDate" });
      const w = await storage.createWarranty({ workOrderId: workOrderId || null, jobId: jobId || null, clientName, clientPhone: clientPhone || null, serviceType, warrantyMonths: Number(warrantyMonths) || 12, startDate, endDate, status: status || "ativa", notes: notes || null });
      res.status(201).json(w);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.put("/api/warranties/:id", async (req, res) => {
    try {
      const w = await storage.updateWarranty(Number(req.params.id), req.body);
      if (!w) return res.status(404).json({ message: "Não encontrado" });
      res.json(w);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/warranties/:id", async (req, res) => {
    try { await storage.deleteWarranty(Number(req.params.id)); res.status(204).send(); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Warranty Incidents ───────────────────────────────────────────────────────
  app.get("/api/warranty-incidents", async (req, res) => {
    try {
      const warrantyId = Number(req.query.warrantyId);
      if (!warrantyId) return res.json([]);
      res.json(await storage.getWarrantyIncidents(warrantyId));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/warranty-incidents", async (req, res) => {
    try {
      const { warrantyId, description, cost, technicianName, resolvedAt, status, notes } = req.body;
      if (!warrantyId || !description) return res.status(400).json({ message: "warrantyId e description obrigatórios" });
      const wi = await storage.createWarrantyIncident({ warrantyId: Number(warrantyId), description, cost: cost ? Number(cost) : 0, technicianName: technicianName || null, resolvedAt: resolvedAt || null, status: status || "aberta", notes: notes || null });
      res.status(201).json(wi);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.put("/api/warranty-incidents/:id", async (req, res) => {
    try {
      const wi = await storage.updateWarrantyIncident(Number(req.params.id), req.body);
      if (!wi) return res.status(404).json({ message: "Não encontrado" });
      res.json(wi);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/warranty-incidents/:id", async (req, res) => {
    try { await storage.deleteWarrantyIncident(Number(req.params.id)); res.status(204).send(); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Production Logs ─────────────────────────────────────────────────────────
  app.get("/api/production-logs", async (req, res) => {
    try { res.json(await storage.getProductionLogs()); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/production-logs", async (req, res) => {
    try {
      const { workOrderId, jobId, clientName, technicianName, userId, date, hoursWorked, squareMeters, serviceType, notes } = req.body;
      if (!technicianName || !date) return res.status(400).json({ message: "technicianName e date obrigatórios" });
      const pl = await storage.createProductionLog({ workOrderId: workOrderId || null, jobId: jobId || null, clientName: clientName || null, technicianName, userId: userId || null, date, hoursWorked: Number(hoursWorked) || 0, squareMeters: Number(squareMeters) || 0, serviceType: serviceType || null, notes: notes || null });
      res.status(201).json(pl);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.put("/api/production-logs/:id", async (req, res) => {
    try {
      const pl = await storage.updateProductionLog(Number(req.params.id), req.body);
      if (!pl) return res.status(404).json({ message: "Não encontrado" });
      res.json(pl);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/production-logs/:id", async (req, res) => {
    try { await storage.deleteProductionLog(Number(req.params.id)); res.status(204).send(); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── NPS Responses ───────────────────────────────────────────────────────────
  app.get("/api/nps-responses", async (req, res) => {
    try { res.json(await storage.getNpsResponses()); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/nps-responses", async (req, res) => {
    try {
      const { workOrderId, jobId, clientName, clientPhone, score, comment, status } = req.body;
      if (!clientName) return res.status(400).json({ message: "clientName obrigatório" });
      const r = await storage.createNpsResponse({ workOrderId: workOrderId || null, jobId: jobId || null, clientName, clientPhone: clientPhone || null, sentAt: new Date(), score: score != null ? Number(score) : null, comment: comment || null, status: status || "pendente" });
      res.status(201).json(r);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.put("/api/nps-responses/:id", async (req, res) => {
    try {
      const { score, comment, status } = req.body;
      const upd: any = { status };
      if (score != null) upd.score = Number(score);
      if (comment != null) upd.comment = comment;
      if (status === "respondido") upd.respondedAt = new Date();
      const r = await storage.updateNpsResponse(Number(req.params.id), upd);
      if (!r) return res.status(404).json({ message: "Não encontrado" });
      res.json(r);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/nps-responses/:id", async (req, res) => {
    try { await storage.deleteNpsResponse(Number(req.params.id)); res.status(204).send(); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Maintenance Reminders ───────────────────────────────────────────────────
  app.get("/api/maintenance-reminders", async (req, res) => {
    try { res.json(await storage.getMaintenanceReminders()); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/maintenance-reminders", async (req, res) => {
    try {
      const { workOrderId, jobId, clientName, clientPhone, serviceType, completedDate, notes } = req.body;
      if (!clientName || !completedDate) return res.status(400).json({ message: "clientName e completedDate obrigatórios" });
      const mr = await storage.createMaintenanceReminder({ workOrderId: workOrderId || null, jobId: jobId || null, clientName, clientPhone: clientPhone || null, serviceType: serviceType || null, completedDate, notes: notes || null });
      res.status(201).json(mr);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.put("/api/maintenance-reminders/:id", async (req, res) => {
    try {
      const mr = await storage.updateMaintenanceReminder(Number(req.params.id), req.body);
      if (!mr) return res.status(404).json({ message: "Não encontrado" });
      res.json(mr);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/maintenance-reminders/:id", async (req, res) => {
    try { await storage.deleteMaintenanceReminder(Number(req.params.id)); res.status(204).send(); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Quote PDF Templates CRUD ────────────────────────────────────────────────
  app.get("/api/quote-templates", requireAdmin, async (req, res) => {
    try { res.json(await storage.getQuoteTemplates()); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.get("/api/quote-templates/default", requireAdmin, async (req, res) => {
    try {
      const t = await storage.getDefaultQuoteTemplate();
      if (!t) return res.status(404).json({ message: "Nenhum template padrão definido" });
      res.json(t);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.get("/api/quote-templates/:id", requireAdmin, async (req, res) => {
    try {
      const t = await storage.getQuoteTemplate(Number(req.params.id));
      if (!t) return res.status(404).json({ message: "Não encontrado" });
      res.json(t);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/quote-templates", requireAdmin, async (req, res) => {
    try {
      const { name, isDefault, config } = req.body;
      if (!name || !config) return res.status(400).json({ message: "name e config obrigatórios" });
      const t = await storage.createQuoteTemplate({ name, isDefault: !!isDefault, config: typeof config === "string" ? config : JSON.stringify(config) });
      if (t.isDefault) await storage.setDefaultQuoteTemplate(t.id);
      res.status(201).json(t);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.put("/api/quote-templates/:id", requireAdmin, async (req, res) => {
    try {
      const { name, isDefault, config } = req.body;
      const upd: any = {};
      if (name !== undefined) upd.name = name;
      if (isDefault !== undefined) upd.isDefault = !!isDefault;
      if (config !== undefined) upd.config = typeof config === "string" ? config : JSON.stringify(config);
      const t = await storage.updateQuoteTemplate(Number(req.params.id), upd);
      if (!t) return res.status(404).json({ message: "Não encontrado" });
      res.json(t);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/quote-templates/:id/set-default", requireAdmin, async (req, res) => {
    try {
      await storage.setDefaultQuoteTemplate(Number(req.params.id));
      const t = await storage.getQuoteTemplate(Number(req.params.id));
      res.json(t);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/quote-templates/:id", requireAdmin, async (req, res) => {
    try { await storage.deleteQuoteTemplate(Number(req.params.id)); res.status(204).send(); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── WhatsApp Templates CRUD ─────────────────────────────────────────────────
  app.get("/api/whatsapp-templates", requireAdmin, async (req, res) => {
    try { res.json(await storage.getWhatsappTemplates()); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/whatsapp-templates", requireAdmin, async (req, res) => {
    try {
      const { name, category, message, variables, active } = req.body;
      if (!name || !message) return res.status(400).json({ message: "name e message obrigatórios" });
      const t = await storage.createWhatsappTemplate({ name, category: category || "geral", message, variables: variables || null, active: active !== false });
      res.status(201).json(t);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.put("/api/whatsapp-templates/:id", requireAdmin, async (req, res) => {
    try {
      const { name, category, message, variables, active } = req.body;
      const upd: any = {};
      if (name !== undefined) upd.name = name;
      if (category !== undefined) upd.category = category;
      if (message !== undefined) upd.message = message;
      if (variables !== undefined) upd.variables = variables;
      if (active !== undefined) upd.active = !!active;
      const t = await storage.updateWhatsappTemplate(Number(req.params.id), upd);
      if (!t) return res.status(404).json({ message: "Não encontrado" });
      res.json(t);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/whatsapp-templates/:id", requireAdmin, async (req, res) => {
    try { await storage.deleteWhatsappTemplate(Number(req.params.id)); res.status(204).send(); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── WhatsApp: Log de envio via wa.me ────────────────────────────────────────
  app.post("/api/whatsapp/log", requireAdmin, async (req, res) => {
    try {
      const { phone, message, flowId, flowName } = req.body;
      if (!phone || !message) return res.status(400).json({ message: "phone e message obrigatórios" });
      const log = await storage.createWhatsappSendLog({
        flowId: flowId || null,
        flowName: flowName || "Envio Manual",
        phone,
        message,
        status: "sent",
        errorMessage: null,
      });
      res.json({ ok: true, log });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Material Withdrawals (Controle de Materiais) ────────────────────────────
  const canManageAllMaterials = async (req: Request) => {
    const userId = req.session?.userId;
    if (!userId) return false;
    return userHasAnyPermission(userId, ["viewAllMaterials"]);
  };

  app.get("/api/material-withdrawals", requireAuth, async (req, res) => {
    try {
      const all = await storage.getMaterialWithdrawals();
      const canSeeAll = await canManageAllMaterials(req);
      const filtered = canSeeAll ? all : all.filter((w: any) => Number(w.userId) === Number(req.session.userId));
      res.json(filtered);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/material-withdrawals/:id", requireAuth, async (req, res) => {
    try {
      const w = await storage.getMaterialWithdrawal(Number(req.params.id));
      if (!w) return res.status(404).json({ message: "Não encontrado" });
      const canSeeAll = await canManageAllMaterials(req);
      if (!canSeeAll && Number((w as any).userId) !== Number(req.session.userId)) return res.status(403).json({ message: "Acesso negado" });
      res.json(w);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/material-withdrawals/quick", requireAdmin, async (req, res) => {
    try {
      const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
      if (!entries.length) return res.status(400).json({ message: "Nenhum registro confirmado" });

      const inventoryItems = await storage.getInventoryItems();
      const inventoryById = new Map(inventoryItems.map(item => [item.id, item]));
      const availableById = new Map(inventoryItems.map(item => [item.id, Math.max(0, Number(item.quantity) || 0)]));
      const users = await storage.getUsers();
      const usersById = new Map(users.map(user => [user.id, user]));
      const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
      const preparedEntries: any[] = [];
      const created: any[] = [];

      for (const entry of entries) {
        const user = usersById.get(Number(entry.userId));
        const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(String(entry.date || "")) ? String(entry.date) : new Date().toISOString().slice(0, 10);
        const entryDate = new Date(`${dateStr}T12:00:00`);
        const rawItems = Array.isArray(entry.items) ? entry.items : [];
        if (!user || !rawItems.length) continue;
        const safeItems = rawItems.map((item: any) => {
          const inventoryItem = inventoryById.get(Number(item.inventoryId));
          const quantity = Math.max(0, Math.trunc(Number(item.quantity)));
          return inventoryItem && quantity > 0
            ? { withdrawalId: 0, inventoryId: inventoryItem.id, productName: inventoryItem.name, unit: inventoryItem.unit || "unid", quantity }
            : null;
        }).filter(Boolean) as any[];
        if (!safeItems.length) continue;
        const hasReturnableItems = hasReturnableMaterialItems(safeItems.map(item => ({ productName: item.productName, type: inventoryById.get(Number(item.inventoryId))?.type })));
        assertMaterialStockAvailability(safeItems, availableById);
        preparedEntries.push({ entry, user, dateStr, entryDate, safeItems, hasReturnableItems });
      }

      for (const { entry, user, dateStr, entryDate, safeItems, hasReturnableItems } of preparedEntries) {
        const withdrawal = await storage.createMaterialWithdrawal(
          {
            userId: user.id,
            username: user.username,
            workOrderId: entry.workOrderId ? Number(entry.workOrderId) : null,
            jobId: null,
            clientName: entry.clientName || null,
            withdrawalDate: dateStr,
            status: hasReturnableItems ? "pendente" : "consumido",
            withdrawalPhoto: null,
            withdrawalSignature: null,
            notes: `Origem: Registro rápido admin${entry.notes ? ` | ${String(entry.notes)}` : ""}`,
            returnPhoto: null,
            returnSignature: null,
            returnNotes: null,
          },
          safeItems,
        );

        for (const item of withdrawal.items) {
          await storage.createInventoryMovement({
            inventoryId: item.inventoryId,
            productName: item.productName,
            type: "SAÍDA",
            quantity: item.quantity,
            date: dateStr,
            month: months[entryDate.getMonth()],
            notes: `Origem: REGISTRO_RAPIDO_ADMIN | Retirada #${withdrawal.id} | Responsavel: ${user.username} | Data informada: ${dateStr}`,
          });
        }
        created.push(withdrawal);
      }

      if (!created.length) return res.status(400).json({ message: "Nenhum funcionário ou material válido foi confirmado" });
      res.status(201).json({ created: created.length, withdrawals: created });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/material-withdrawals", requireAuth, async (req, res) => {
    try {
      const sessionUser = await storage.getUser(Number(req.session.userId));
      if (!sessionUser) return res.status(401).json({ message: "Não autenticado" });
      const canCreateForOthers = await canManageAllMaterials(req);
      const { userId, username, workOrderId, jobId, clientName, withdrawalPhoto, withdrawalSignature, notes, items } = req.body;
      const effectiveUserId = canCreateForOthers && userId ? Number(userId) : Number(req.session.userId);
      const effectiveUser = effectiveUserId === Number(req.session.userId) ? sessionUser : await storage.getUser(effectiveUserId);
      const effectiveUsername = canCreateForOthers && username ? String(username) : effectiveUser?.username || sessionUser.username;
      if (!effectiveUserId || !effectiveUsername) return res.status(400).json({ message: "Usuário responsável é obrigatório" });
      if (!items || items.length === 0) return res.status(400).json({ message: "Pelo menos um item é obrigatório" });
      if (!withdrawalPhoto) return res.status(400).json({ message: "Foto da retirada é obrigatória" });
      if (!withdrawalSignature) return res.status(400).json({ message: "Assinatura é obrigatória" });

      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
      const month = months[now.getMonth()];

      const inventoryItems = await storage.getInventoryItems();
      const inventoryById = new Map(inventoryItems.map(item => [item.id, item]));
      const withdrawalItems = items.map((i: any) => {
        const inventoryItem = inventoryById.get(Number(i.inventoryId));
        const quantity = Math.max(0, Math.trunc(Number(i.quantity)));
        return inventoryItem && quantity > 0
          ? { withdrawalId: 0, inventoryId: inventoryItem.id, productName: inventoryItem.name, unit: inventoryItem.unit || i.unit || "unid", quantity, type: inventoryItem.type }
          : null;
      }).filter(Boolean) as any[];
      if (!withdrawalItems.length) return res.status(400).json({ message: "Nenhum item válido para retirada" });
      const requestedById = new Map<number, any>();
      for (const item of withdrawalItems) {
        const current = requestedById.get(item.inventoryId);
        requestedById.set(item.inventoryId, current
          ? { ...current, quantity: current.quantity + item.quantity }
          : { inventoryId: item.inventoryId, productName: item.productName, quantity: item.quantity });
      }
      assertMaterialStockAvailability(Array.from(requestedById.values()), new Map(inventoryItems.map(item => [item.id, Math.max(0, Number(item.quantity) || 0)])));
      const hasReturnableItems = hasReturnableMaterialItems(withdrawalItems);

      const withdrawal = await storage.createMaterialWithdrawal(
        { userId: effectiveUserId, username: effectiveUsername, workOrderId: workOrderId || null, jobId: jobId || null, clientName: clientName || null, withdrawalDate: dateStr,
          status: hasReturnableItems ? "pendente" : "consumido", withdrawalPhoto, withdrawalSignature, notes: notes || null,
          returnPhoto: null, returnSignature: null, returnNotes: null },
        withdrawalItems.map(({ type: _type, ...item }: any) => item)
      );

      // Register inventory SAÍDA movements
      for (const item of withdrawal.items) {
        await storage.createInventoryMovement({
          inventoryId: item.inventoryId,
          productName: item.productName,
          type: "SAÍDA",
          quantity: item.quantity,
          date: dateStr,
          month,
          notes: `Origem: RETIRADA_MATERIAL | Retirada #${withdrawal.id}${workOrderId ? " | OS #" + workOrderId : ""} | Responsavel: ${effectiveUsername}${clientName ? " | Cliente: " + clientName : ""}`,
        });
      }

      res.status(201).json(withdrawal);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/material-withdrawals/:id/retorno", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getMaterialWithdrawal(id);
      if (!existing) return res.status(404).json({ message: "Saída não encontrada" });
      const canReturnAll = await canManageAllMaterials(req);
      if (!canReturnAll && Number((existing as any).userId) !== Number(req.session.userId)) return res.status(403).json({ message: "Acesso negado" });
      if (existing.status === "retornado" || existing.status === "consumido") return res.status(400).json({ message: "Esta saída não possui retorno pendente" });

      const { returnPhoto, returnSignature, returnNotes, items } = req.body;
      if (!returnPhoto) return res.status(400).json({ message: "Foto do retorno é obrigatória" });
      if (!returnSignature) return res.status(400).json({ message: "Assinatura do retorno é obrigatória" });
      if (!items || items.length === 0) return res.status(400).json({ message: "Informe os itens retornados" });

      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
      const month = months[now.getMonth()];

      const normalizedReturnItems = items.map((item: any) => ({
        ...item,
        returnedQuantity: Math.max(0, Math.trunc(Number(item.returnedQuantity) || 0)),
        condition: normalizeReturnCondition(item.condition),
      }));

      // Update withdrawal items (returnedQuantity and condition)
      await storage.updateMaterialWithdrawalItems(id, normalizedReturnItems);

      // Determine new status
      const allReturned = existing.items.every((orig: any) => {
        if (!hasReturnableMaterialItems([{ productName: orig.productName }])) return true;
        const returned = normalizedReturnItems.find((i: any) => i.id === orig.id);
        return returned ? returned.returnedQuantity >= orig.quantity : false;
      });
      const newStatus = allReturned ? "retornado" : "parcial";

      await storage.updateMaterialWithdrawal(id, {
        status: newStatus,
        returnPhoto,
        returnSignature,
        returnNotes: returnNotes || null,
        returnedAt: now,
      } as any);

      // Register ENTRADA movements for returned (non-lost) items
      for (const retItem of normalizedReturnItems) {
        if (retItem.returnedQuantity > 0 && shouldRestoreReturnedQuantityToStock(retItem.condition)) {
          const original = existing.items.find((x: any) => x.id === retItem.id);
          if (!original) continue;
          await storage.createInventoryMovement({
            inventoryId: original.inventoryId,
            productName: original.productName,
            type: "ENTRADA",
            quantity: retItem.returnedQuantity,
            date: dateStr,
            month,
            notes: `Origem: DEVOLUCAO_MATERIAL | Retirada #${existing.id}${existing.workOrderId ? " | OS #" + existing.workOrderId : ""} | Responsavel: ${existing.username}${existing.clientName ? " | Cliente: " + existing.clientName : ""} | Condicao: ${retItem.condition}`,
          });
        }
      }

      // Lost, damaged and maintenance items require manual responsibility review.
      const rules = await storage.getSalaryDiscountRules();
      for (const retItem of normalizedReturnItems) {
        if (retItem.condition === "perdido" || retItem.condition === "danificado" || retItem.condition === "manutencao") {
          const original = existing.items.find((x: any) => x.id === retItem.id);
          if (!original) continue;
          const matchingRule = rules.find((r: any) => r.condition === retItem.condition && r.active);
          await storage.createSalaryDiscount({
            userId: existing.userId,
            username: existing.username,
            withdrawalId: id,
            withdrawalItemId: retItem.id,
            productName: original.productName,
            condition: retItem.condition,
            ruleId: matchingRule?.id || null,
            ruleName: matchingRule?.name || null,
            discountAmount: 0, // Admin fills in the actual amount when approving
            status: "pendente",
            notes: null,
            approvedBy: null,
          });
        }
      }

      const updated = await storage.getMaterialWithdrawal(id);
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Salary Discount Rules ───────────────────────────────────────────────────
  app.get("/api/salary-discount-rules", requireAdmin, async (req, res) => {
    try { res.json(await storage.getSalaryDiscountRules()); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/salary-discount-rules", requireAdmin, async (req, res) => {
    try {
      const { name, condition, discountType, discountValue, active } = req.body;
      if (!name || !condition) return res.status(400).json({ message: "name e condition são obrigatórios" });
      const rule = await storage.createSalaryDiscountRule({ name, condition, discountType: discountType || "percent", discountValue: discountValue ?? 100, active: active !== false });
      res.status(201).json(rule);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/salary-discount-rules/:id", requireAdmin, async (req, res) => {
    try {
      const upd: any = {};
      for (const k of ["name", "condition", "discountType", "discountValue", "active"]) if (req.body[k] !== undefined) upd[k] = req.body[k];
      const rule = await storage.updateSalaryDiscountRule(Number(req.params.id), upd);
      if (!rule) return res.status(404).json({ message: "Não encontrado" });
      res.json(rule);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/salary-discount-rules/:id", requireAdmin, async (req, res) => {
    try { await storage.deleteSalaryDiscountRule(Number(req.params.id)); res.status(204).send(); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Salary Discounts ─────────────────────────────────────────────────────────
  app.get("/api/salary-discounts", requireAdmin, async (req, res) => {
    try { res.json(await storage.getSalaryDiscounts()); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/audits/artificial-data", requireAdmin, async (_req, res) => {
    try {
      const [inventory, movements, users] = await Promise.all([
        storage.getInventoryItems(),
        storage.getInventoryMovements(),
        storage.getUsers(),
      ]);
      res.json(buildArtificialDataAudit({ inventory, movements, users }));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/salary-discounts/:id/approve", requireAdmin, async (req, res) => {
    try {
      const { discountAmount, notes, approvedBy } = req.body;
      if (discountAmount === undefined) return res.status(400).json({ message: "discountAmount é obrigatório" });
      const updated = await storage.updateSalaryDiscount(Number(req.params.id), {
        status: "aprovado",
        discountAmount: Number(discountAmount),
        notes: notes || null,
        approvedBy: approvedBy || "Admin",
        approvedAt: new Date(),
      } as any);
      if (!updated) return res.status(404).json({ message: "Não encontrado" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/salary-discounts/:id/reject", requireAdmin, async (req, res) => {
    try {
      const { notes } = req.body;
      const updated = await storage.updateSalaryDiscount(Number(req.params.id), {
        status: "rejeitado",
        notes: notes || null,
      } as any);
      if (!updated) return res.status(404).json({ message: "Não encontrado" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── WorkOrders: check pending materials ─────────────────────────────────────
  app.get("/api/work-orders/:id/pending-materials", requireAuth, async (req, res) => {
    try {
      const woId = Number(req.params.id);
      const all = await storage.getMaterialWithdrawals();
      const pending = all.filter((w: any) => w.workOrderId === woId && isMaterialWithdrawalPending(w));
      res.json(pending);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── WhatsApp Send Logs ───────────────────────────────────────────────────────
  app.get("/api/whatsapp-logs", requireAdmin, async (req, res) => {
    try { res.json(await storage.getWhatsappSendLogs(50)); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── BACKUP / RESTORE ─────────────────────────────────────────────────────────

  app.get("/api/backup/completo", requireAdmin, async (_req, res) => {
    try {
      const backup = await buildCompleteBackupPackage(storage, {
        environment: process.env.DATABASE_URL ? "persistent-postgresql" : "memory-preview",
        erpVersion: process.env.npm_package_version || "1.0.0",
      });
      const resetToken = randomUUID();
      operationalResetTokens.set(resetToken, Date.now() + 15 * 60 * 1000);
      res.json({ ...backup, resetToken });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  const normalizeCompleteRestoreUsers = async (flatData: Record<string, any[]>) => {
    if (!flatData.users) return flatData;
    flatData.users = await Promise.all(flatData.users.map(async (user: any) => ({
      id: user.id,
      username: user.username,
      role: user.role === "admin" ? "admin" : "funcionario",
      roleId: user.roleId ?? null,
      jobTitle: user.jobTitle ?? null,
      fullName: user.fullName ?? null,
      birthDate: user.birthDate ?? null,
      status: user.status === "inativo" ? "inativo" : "ativo",
      mustChangePassword: false,
      createdAt: user.createdAt ?? null,
      password: /^\$2[aby]\$/.test(String(user.passwordHash || user.password || ""))
        ? String(user.passwordHash || user.password)
        : await bcrypt.hash(randomBytes(32).toString("hex"), BCRYPT_ROUNDS),
    })));
    return flatData;
  };

  app.post("/api/backup/preview/completo", requireAdmin, async (req, res) => {
    try {
      const packageData = req.body?.backup;
      const mode = req.body?.mode === "replace" ? "replace" : "merge";
      const validModules = Object.keys(COMPLETE_BACKUP_MODULE_TABLES) as CompleteBackupModule[];
      const requestedModules: unknown[] = Array.isArray(req.body?.modules) ? req.body.modules : [];
      const modules: CompleteBackupModule[] = requestedModules.filter(
        (name): name is CompleteBackupModule => typeof name === "string" && validModules.includes(name as CompleteBackupModule),
      );

      validateCompleteBackupPackage(packageData);
      if (modules.length === 0) return res.status(400).json({ message: "Selecione ao menos um modulo." });

      const current = await storage.getCompleteBackupData();
      const incoming = flattenCompleteBackupData(packageData, modules);
      const preview = buildRestorePreview(current, incoming, modules, mode);
      res.json({ preview });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.post("/api/backup/preview/modular", requireAdmin, async (req, res) => {
    try {
      const packageData = req.body?.backup;
      const mode = req.body?.mode === "replace" ? "replace" : "merge";
      validateTechnicalBackupPayload(packageData);
      const technical = flattenTechnicalBackupPayload(packageData);
      const current = await storage.getCompleteBackupData();
      const preview = buildRestorePreview(current, technical.data, technical.modules, mode, technical.tables);
      res.json({ preview, module: packageData.module, type: packageData.type });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.post("/api/backup/preview/pdf", requireAdmin, async (req, res) => {
    try {
      const selectedType = String(req.body?.selectedType || "") as any;
      const allowedTypes = new Set(["usuarios", "produtos", "servicos", "estoque", "financeiro", "clientes", "orcamentos", "ordens-servico", "pos-venda", "garantias", "materiais"]);
      if (!allowedTypes.has(selectedType)) return res.status(400).json({ message: "Selecione um módulo válido." });
      const files: Array<{ name?: string; dataBase64?: string; mimeType?: string }> = Array.isArray(req.body?.files) ? req.body.files : [];
      if (files.length === 0) return res.status(400).json({ message: "Anexe ao menos um PDF." });
      if (files.length > 12) return res.status(400).json({ message: "Envie no máximo 12 PDFs por preview." });

      const safetyBackup = await buildCompleteBackupPackage(storage, {
        environment: process.env.DATABASE_URL ? "persistent-postgresql" : "memory-preview",
        erpVersion: process.env.npm_package_version || "1.0.0",
      });
      const previews = [];
      for (const file of files) {
        const fileName = String(file.name || "relatorio.pdf");
        if (!fileName.toLowerCase().endsWith(".pdf")) {
          previews.push({
            fileName,
            selectedType,
            reportType: selectedType,
            title: fileName,
            headerTotal: 0,
            extracted: 0,
            newCount: 0,
            existingCount: 0,
            updatedCount: 0,
            ignoredCount: 0,
            errorCount: 1,
            pendingCount: 0,
            duplicateCount: 0,
            warnings: [],
            ignored: [],
            pending: [],
            errors: ["Arquivo bloqueado: selecione somente PDFs."],
            rows: [],
            canApply: false,
          });
          continue;
        }
        const encoded = String(file.dataBase64 || "").replace(/^data:application\/pdf;base64,/i, "");
        const bytes = Uint8Array.from(Buffer.from(encoded, "base64"));
        previews.push(await previewErpPdfBuffer({ fileName, selectedType, data: bytes }));
      }
      res.json({ previews, safetyBackup });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Não foi possível ler o PDF do ERP." });
    }
  });

  // Material sales / cart
  app.get("/api/material-sales", async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Não autenticado" });
      const canApprove = user.role === "admin" || await userHasAnyPermission(user.id, ["approveMaterialSales"]);
      const [sales, products, inventoryItems] = await Promise.all([
        storage.getMaterialSales(), storage.getProducts(), storage.getInventoryItems(),
      ]);
      const setting = (await storage.getSettings()).find(item => item.key === "materialSalesMaxDiscount");
      const generalMaxDiscount = Number(setting?.value ?? 10);
      res.json({
        sales: canApprove ? sales : sales.filter(sale => sale.createdByUserId === user.id),
        generalMaxDiscount,
        canApprove,
        catalog: products.filter(product => product.active).map(product => {
          const inventoryItem = resolveSaleInventoryItem(product, inventoryItems);
          return {
            ...product,
            inventoryId: inventoryItem?.id || product.inventoryId || null,
            stock: Number(inventoryItem?.quantity || 0),
            effectiveMaxDiscount: getEffectiveMaterialSaleDiscountLimit(product, generalMaxDiscount),
          };
        }),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Internal Error" });
    }
  });

  app.post("/api/material-sales", async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Não autenticado" });
      const buyerName = String(req.body.buyerName || "").trim();
      const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
      if (!buyerName || requestedItems.length === 0) return res.status(400).json({ message: "Informe o comprador e ao menos um material." });

      const [products, inventoryItems, settings] = await Promise.all([
        storage.getProducts(), storage.getInventoryItems(), storage.getSettings(),
      ]);
      const generalMaxDiscount = Number(settings.find(item => item.key === "materialSalesMaxDiscount")?.value ?? 10);
      const availableByInventoryId = new Map(inventoryItems.map(item => [item.id, Math.max(0, Number(item.quantity) || 0)]));
      let subtotal = 0;
      let total = 0;
      const items = requestedItems.map((requested: any) => {
        const product = products.find(candidate => candidate.id === Number(requested.productId) && candidate.active);
        if (!product) throw new Error("Produto inválido.");
        const inventoryItem = resolveSaleInventoryItem(product, inventoryItems);
        const quantity = Math.max(1, Math.floor(Number(requested.quantity) || 0));
        const discountPercent = Math.max(0, Number(requested.discountPercent) || 0);
        const maxDiscount = getEffectiveMaterialSaleDiscountLimit(product, generalMaxDiscount);
        if (discountPercent > maxDiscount) throw new Error(`Desconto acima do limite para ${product.name}. Limite permitido: ${maxDiscount}%.`);
        if (!inventoryItem) throw new Error(`Produto ${product.name} ainda não possui item correspondente no estoque.`);
        const available = availableByInventoryId.get(inventoryItem.id) ?? 0;
        if (quantity > available) throw new Error(`Estoque insuficiente para ${product.name}: solicitado ${quantity}, disponível ${available}.`);
        availableByInventoryId.set(inventoryItem.id, available - quantity);
        const canOverridePrice = user.role === "admin" || user.role === "supervisor" || user.role === "financeiro";
        const requestedUnitPrice = normalizeMoneyReais(requested.unitPrice, { fallback: Number(product.salePrice) || 0, field: "unitPrice" });
        const unitPrice = canOverridePrice ? requestedUnitPrice : normalizeMoneyReais(product.salePrice, { field: "salePrice" });
        const originalTotal = unitPrice * quantity;
        const itemTotal = originalTotal * (1 - discountPercent / 100);
        subtotal += originalTotal;
        total += itemTotal;
        return {
          productId: product.id,
          inventoryId: inventoryItem.id,
          name: product.name,
          unit: product.unit || inventoryItem.unit || "un",
          quantity,
          unitPrice,
          discountPercent,
          maxDiscount,
          total: Number(itemTotal.toFixed(2)),
        };
      });

      const sale = await storage.createMaterialSale({
        createdByUserId: user.id,
        createdByUsername: user.username,
        buyerName,
        buyerPhone: String(req.body.buyerPhone || "").trim() || null,
        notes: String(req.body.notes || "").trim() || null,
        items: JSON.stringify(items),
        subtotal: Number(subtotal.toFixed(2)),
        discountAmount: Number((subtotal - total).toFixed(2)),
        total: Number(total.toFixed(2)),
        status: "pendente",
        approvedByUserId: null,
        approvedByUsername: null,
      });
      res.status(201).json(sale);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Não foi possível criar a venda." });
    }
  });

  app.post("/api/material-sales/:id/approve", requireAnyPermission(["approveMaterialSales"]), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Não autenticado" });
      const sale = await storage.approveMaterialSale(Number(req.params.id), { id: user.id, username: user.username });
      if (!sale) return res.status(404).json({ message: "Venda não encontrada" });
      res.json(sale);
    } catch (err: any) {
      res.status(409).json({ message: err.message || "Não foi possível aprovar a venda." });
    }
  });

  app.post("/api/material-sales/:id/reject", requireAnyPermission(["approveMaterialSales"]), async (req, res) => {
    const sale = await storage.getMaterialSale(Number(req.params.id));
    if (!sale) return res.status(404).json({ message: "Venda não encontrada" });
    if (sale.status !== "pendente") return res.status(409).json({ message: "A venda já foi processada." });
    const updated = await storage.updateMaterialSale(sale.id, { status: "rejeitada" });
    res.json(updated);
  });

  app.post("/api/material-sales/settings", requireAnyPermission(["approveMaterialSales"]), async (req, res) => {
    const value = Math.max(0, Math.min(100, Number(req.body.generalMaxDiscount) || 0));
    const setting = await storage.updateSetting("materialSalesMaxDiscount", value);
    res.json(setting);
  });

  app.post("/api/backup/restore/completo", requireAdmin, async (req, res) => {
    try {
      const packageData = req.body?.backup;
      const mode = req.body?.mode === "replace" ? "replace" : "merge";
      const validModules = Object.keys(COMPLETE_BACKUP_MODULE_TABLES) as CompleteBackupModule[];
      const requestedModules: unknown[] = Array.isArray(req.body?.modules) ? req.body.modules : [];
      const modules: CompleteBackupModule[] = requestedModules.filter(
        (name): name is CompleteBackupModule => typeof name === "string" && validModules.includes(name as CompleteBackupModule),
      );

      validateCompleteBackupPackage(packageData);
      if (modules.length === 0) return res.status(400).json({ message: "Selecione ao menos um modulo." });
      if (req.body?.confirmation !== "RESTAURAR ERP") {
        return res.status(400).json({ message: "Confirmacao de restauracao ausente." });
      }
      if (mode === "replace" && req.body?.replaceConfirmation !== "SUBSTITUIR MODULOS") {
        return res.status(400).json({ message: "Confirmacao forte para substituicao ausente." });
      }

      const flatData = flattenCompleteBackupData(packageData, modules);

      const preview = buildRestorePreview(await storage.getCompleteBackupData(), flatData, modules, mode);
      if (preview.totals.conflictCount > 0) return res.status(409).json({ message: "Restauração bloqueada por conflitos de relacionamento.", preview });

      await normalizeCompleteRestoreUsers(flatData);

      const result = await storage.restoreCompleteBackup(flatData, modules, mode);
      res.json({ message: "Pacote restaurado com integridade.", mode, modules, ...result });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/backup/restore/modular", requireAdmin, async (req, res) => {
    try {
      const packageData = req.body?.backup;
      const mode = req.body?.mode === "replace" ? "replace" : "merge";
      validateTechnicalBackupPayload(packageData);
      if (req.body?.confirmation !== "RESTAURAR MODULO") {
        return res.status(400).json({ message: "Confirmacao de restauracao modular ausente." });
      }
      if (mode === "replace" && req.body?.replaceConfirmation !== "SUBSTITUIR MODULO") {
        return res.status(400).json({ message: "Confirmacao forte para substituicao modular ausente." });
      }

      const technical = flattenTechnicalBackupPayload(packageData);
      const current = await storage.getCompleteBackupData();
      const preview = buildRestorePreview(current, technical.data, technical.modules, mode, technical.tables);
      if (preview.totals.conflictCount > 0) return res.status(409).json({ message: "Importação modular bloqueada por conflitos de relacionamento.", preview });

      const restoreData = { ...technical.data };
      if (mode === "replace") {
        for (const moduleName of technical.modules) {
          for (const tableName of COMPLETE_BACKUP_MODULE_TABLES[moduleName]) {
            if (!technical.tables.includes(tableName)) restoreData[tableName] = current[tableName] || [];
          }
        }
      }
      await normalizeCompleteRestoreUsers(restoreData);
      const result = await storage.restoreCompleteBackup(restoreData, technical.modules, mode);
      res.json({ message: "JSON tecnico modular restaurado com integridade.", mode, module: packageData.module, type: packageData.type, ...result });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/backup/usuarios", requireAdmin, async (req, res) => {
    try {
      const [allUsers, allRoles] = await Promise.all([storage.getUsers(), storage.getRoles()]);
      const rolesById = new Map(allRoles.map(role => [role.id, role]));
      const safeInitialPassword = (value: any) => {
        const raw = String(value || "").trim();
        if (!raw) return null;
        const digits = raw.replace(/\D/g, "");
        if (digits.length === 8) {
          if (/^\d{4}/.test(raw) && Number(digits.slice(4, 6)) <= 12) {
            return `${digits.slice(6, 8)}${digits.slice(4, 6)}${digits.slice(0, 4)}`;
          }
          return digits;
        }
        try { return generateInitialPassword(raw); } catch { return null; }
      };
      const safeBirthDate = (value: any) => {
        const raw = String(value || "").trim();
        if (!raw) return null;
        const digits = raw.replace(/\D/g, "");
        if (digits.length !== 8) return raw;
        if (/^\d{4}/.test(raw) && Number(digits.slice(4, 6)) <= 12) {
          return `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
        }
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
      };
      const roleData = allRoles.map(role => {
        let permissions: Record<string, boolean> = {};
        try { permissions = JSON.parse(role.permissions || "{}"); } catch {}
        return { id: role.id, name: role.name, label: role.label, permissions, isDefault: role.isDefault, createdAt: role.createdAt };
      });
      const userData = allUsers.map(user => {
        const userAny = user as any;
        const customRole = rolesById.get((user as any).roleId);
        const mustChangePassword = userAny.mustChangePassword === true;
        const initialPassword =
          safeInitialPassword(userAny.senhaInicial) ||
          safeInitialPassword(userAny.initialPassword) ||
          safeInitialPassword(userAny.birthDate) ||
          safeInitialPassword(userAny.birth_date) ||
          safeInitialPassword(userAny.dataNascimento) ||
          null;
        const birthDate = safeBirthDate(userAny.birthDate || userAny.birth_date || userAny.dataNascimento);
        const status = userAny.active === false || userAny.status === "inativo" ? "Inativo" : "Ativo";
        const fullName = userAny.nomeCompleto || userAny.fullName || userAny.name || user.username;
        const cargo = customRole?.label || userAny.jobTitle || null;
        return {
          id: user.id,
          login: user.username,
          senhaInicial: initialPassword ? String(initialPassword) : "Data de nascimento pendente",
          nomeCompleto: fullName,
          cargo,
          perfil: user.role,
          status,
          username: user.username,
          role: user.role,
          roleId: userAny.roleId || null,
          roleName: customRole?.name || null,
          roleLabel: customRole?.label || null,
          jobTitle: userAny.jobTitle || null,
          fullName: userAny.fullName || null,
          birthDate,
          operationalStatus: userAny.status || "ativo",
          active: true,
          mustChangePassword: false,
        };
      });
      res.json({
        type: "usuarios",
        version: "2.0",
        exportedAt: new Date().toISOString(),
        security: { plaintextPasswordsIncluded: false, passwordHashesIncluded: false },
        data: { users: userData, roles: roleData },
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/backup/restore/usuarios", requireAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data?.users) || !Array.isArray(data?.roles)) {
        return res.status(400).json({ message: "Formato de backup de usuários inválido" });
      }

      const restoreInitialPassword = (user: any) => {
        const explicit = String(user?.senhaInicial || user?.initialPassword || "").trim();
        if (explicit && !/^(Senha alterada|Não disponível|—)$/i.test(explicit)) {
          const digits = explicit.replace(/\D/g, "");
          if (digits.length === 8) {
            if (/^\d{4}/.test(explicit) && Number(digits.slice(4, 6)) <= 12) {
              return `${digits.slice(6, 8)}${digits.slice(4, 6)}${digits.slice(0, 4)}`;
            }
            return digits;
          }
        }
        const birthDate = String(user?.birthDate || user?.dataNascimento || user?.birth_date || "").trim();
        if (!birthDate) return "";
        try { return generateInitialPassword(birthDate); } catch { return ""; }
      };

      const restoreBirthDate = (user: any, initialPassword: string) => {
        const supplied = String(user?.birthDate || user?.dataNascimento || user?.birth_date || "").trim();
        if (supplied) return supplied;
        const digits = initialPassword.replace(/\D/g, "");
        return digits.length === 8 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}` : null;
      };

      const existingRoles = await storage.getRoles();
      const rolesByName = new Map(existingRoles.map(role => [role.name.toLocaleLowerCase("pt-BR"), role]));
      const restoredRoles = new Map<string, number>();
      const restoredRoleIds = new Map<number, number>();
      let rolesCreated = 0, rolesUpdated = 0, created = 0, updated = 0, skipped = 0;

      for (const role of data.roles) {
        if (!role?.name || !role?.label) { skipped++; continue; }
        const key = String(role.name).toLocaleLowerCase("pt-BR");
        const permissions = typeof role.permissions === "string" ? role.permissions : JSON.stringify(role.permissions || {});
        const existing = rolesByName.get(key);
        if (existing) {
          await storage.updateRole(existing.id, { label: role.label, permissions, isDefault: Boolean(role.isDefault) });
          restoredRoles.set(key, existing.id);
          if (role.id) restoredRoleIds.set(Number(role.id), existing.id);
          rolesUpdated++;
        } else {
          const saved = await storage.createRole({ name: role.name, label: role.label, permissions, isDefault: Boolean(role.isDefault) });
          restoredRoles.set(key, saved.id);
          if (role.id) restoredRoleIds.set(Number(role.id), saved.id);
          rolesCreated++;
        }
      }

      for (const user of data.users) {
        const username = String(user?.username || user?.login || "").trim();
        const passwordHash = String(user?.passwordHash || "");
        const initialPassword = restoreInitialPassword(user);
        if (!username) { skipped++; continue; }
        if (username.toLocaleLowerCase("pt-BR") === "admin") { skipped++; continue; }
        const roleName = user.roleName || user.cargo;
        const roleId = roleName
          ? restoredRoles.get(String(roleName).toLocaleLowerCase("pt-BR")) ||
            restoredRoles.get(String(user.roleName || "").toLocaleLowerCase("pt-BR")) ||
            null
          : user.roleId
            ? restoredRoleIds.get(Number(user.roleId)) || null
            : null;
        const existing = await findUserByUsername(username);
        const hasBcrypt = /^\$2[aby]\$/.test(passwordHash);
        const hasInitialPassword = Boolean(initialPassword);
        if (!existing && !hasBcrypt && !hasInitialPassword) { skipped++; continue; }
        const shouldResetInitialPassword = hasInitialPassword && (user.resetInitialPassword === true || !existing);
        const values: any = {
          username,
          role: user.role === "admin" || user.perfil === "admin" ? "admin" : "funcionario",
          roleId,
          jobTitle: user.jobTitle || user.roleLabel || user.cargo || null,
          fullName: user.fullName || user.nomeCompleto || null,
          birthDate: restoreBirthDate(user, initialPassword),
          status: user.status === "Inativo" || user.status === "inativo" ? "inativo" : "ativo",
          mustChangePassword: false,
        };
        if (existing) {
          if (existing.role === "admin") { skipped++; continue; }
          if (hasBcrypt) values.password = passwordHash;
          else if (shouldResetInitialPassword) values.password = await bcrypt.hash(initialPassword, BCRYPT_ROUNDS);
          await storage.updateUser(existing.id, values);
          updated++;
        } else {
          values.password = hasBcrypt ? passwordHash : await bcrypt.hash(initialPassword, BCRYPT_ROUNDS);
          await storage.createUser(values);
          created++;
        }
      }

      res.json({ message: "Usuários e cargos restaurados com segurança.", created, updated, deleted: 0, skipped, rolesCreated, rolesUpdated });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/maintenance/operational-reset", requireAdmin, async (req, res) => {
    try {
      if (req.body?.confirmation !== "LIMPAR DADOS OPERACIONAIS") return res.status(400).json({ message: "Digite exatamente LIMPAR DADOS OPERACIONAIS." });
      const token = String(req.body?.resetToken || "");
      const expiresAt = operationalResetTokens.get(token);
      if (!expiresAt || expiresAt < Date.now()) return res.status(400).json({ message: "Gere e baixe um Backup Completo Técnico antes da limpeza." });
      operationalResetTokens.delete(token);
      const result = await storage.clearOperationalData();
      res.json({ ...result, message: "Dados operacionais removidos. Usuários, cargos e configurações foram preservados." });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/backup/estoque", requireAdmin, async (req, res) => {
    try {
      const items = (await storage.getInventoryItems()).map((item: any) => ({ ...item, returnPolicy: getMaterialReturnPolicyLabel(item) }));
      const movements = await storage.getInventoryMovements();
      res.json({ type: "estoque", version: "1.0", exportedAt: new Date().toISOString(), data: { items, movements } });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/backup/produtos", requireAdmin, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json({ type: "produtos", version: "1.0", exportedAt: new Date().toISOString(), data: { products } });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/backup/servicos", requireAdmin, async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json({ type: "servicos", version: "1.0", exportedAt: new Date().toISOString(), data: { services } });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/backup/materiais", requireAdmin, async (req, res) => {
    try {
      const withdrawals = await storage.getMaterialWithdrawals();
      const movements = await storage.getInventoryMovements();
      res.json(buildMaterialControlExportPayload({
        withdrawals,
        movements,
        period: String(req.query.period || "all"),
        year: req.query.year ? String(req.query.year) : undefined,
        month: req.query.month ? String(req.query.month) : undefined,
      }));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/backup/financeiro", requireAdmin, async (req, res) => {
    try {
      const payments = await storage.getPayments();
      const transactions = await storage.getTransactions();
      res.json({ type: "financeiro", version: "1.0", exportedAt: new Date().toISOString(), data: { payments, transactions } });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/backup/pos-venda", requireAdmin, async (req, res) => {
    try {
      const warranties = await storage.getWarranties();
      const npsResponses = await storage.getNpsResponses();
      const maintenanceReminders = await storage.getMaintenanceReminders();
      res.json({ type: "pos-venda", version: "1.0", exportedAt: new Date().toISOString(), data: { warranties, npsResponses, maintenanceReminders } });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Restore endpoints (upsert by name — safe merge, nothing deleted) ──────────

  app.post("/api/backup/restore/estoque", requireAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      const mode = (req.query.mode as string) || "merge";
      if (!data?.items) return res.status(400).json({ message: "Formato de backup inválido" });

      const movements: any[] = data.movements || [];
      const preserveItemQuantitiesAfterMovements = Boolean(req.body?.preserveItemQuantitiesAfterMovements);
      let updated = 0, created = 0, deleted = 0;
      let movementsRestored = 0, movementsDeleted = 0;

      // ── Build name→newId map so we can re-link movements after restore ───────
      const nameToNewId = new Map<string, number>();

      if (mode === "overwrite") {
        // Delete all existing movements first (to avoid FK issues)
        const existingMovs = await storage.getInventoryMovements();
        for (const m of existingMovs) { await storage.deleteInventoryMovement(m.id); movementsDeleted++; }
        // Delete all existing items
        const existingItems = await storage.getInventoryItems();
        for (const i of existingItems) { await storage.deleteInventoryItem(i.id); deleted++; }
        // Recreate all items from backup
        for (const item of data.items) {
          const newItem = await storage.createInventoryItem({
            name: item.name, type: item.type || "Geral", unit: item.unit || "un",
            quantity: item.quantity ?? 0, minStock: item.minStock ?? 5, pricePerUnit: normalizeMoneyReais(item.pricePerUnit),
          });
          created++;
          nameToNewId.set(item.name.toLowerCase().trim(), newItem.id);
        }
      } else {
        // Merge mode: upsert items by name
        const existing = await storage.getInventoryItems();
        const byName = new Map(existing.map((i: any) => [i.name.toLowerCase().trim(), i]));
        for (const item of data.items) {
          const key = String(item.name).toLowerCase().trim();
          const found = byName.get(key);
          if (found) {
            await storage.updateInventoryItem(found.id, {
              quantity: item.quantity ?? found.quantity,
              minStock: item.minStock ?? found.minStock,
              pricePerUnit: normalizeMoneyReais(item.pricePerUnit, { fallback: Number(found.pricePerUnit) || 0 }),
            });
            updated++;
            nameToNewId.set(key, found.id);
          } else {
            const newItem = await storage.createInventoryItem({
              name: item.name, type: item.type || "Geral", unit: item.unit || "un",
              quantity: item.quantity ?? 0, minStock: item.minStock ?? 5, pricePerUnit: normalizeMoneyReais(item.pricePerUnit),
            });
            created++;
            nameToNewId.set(key, newItem.id);
          }
        }
      }

      // ── Restore movements — re-link by item name ─────────────────────────────
      if (movements.length > 0) {
        // Build existing movement deduplication key (merge mode only)
        let existingMovKeys = new Set<string>();
        if (mode === "merge") {
          const existingMovs = await storage.getInventoryMovements();
          existingMovKeys = new Set(existingMovs.map((m: any) =>
            `${m.inventoryId}|${m.type}|${m.quantity}|${m.date}`
          ));
        }

        // Build old backup itemId → name map (from backup items)
        const backupIdToName = new Map<number, string>();
        for (const item of data.items) {
          if (item.id) backupIdToName.set(item.id, item.name.toLowerCase().trim());
        }

        for (const mov of movements) {
          // Find new inventoryId by item name (from old backup id → name → new id)
          const itemName = backupIdToName.get(mov.inventoryId) ?? String(mov.productName || "").toLowerCase().trim();
          const newInventoryId = nameToNewId.get(itemName);
          if (!newInventoryId) continue; // Item not found, skip

          const movDate = mov.date || new Date().toISOString().split("T")[0];
          const dedupeKey = `${newInventoryId}|${mov.type}|${mov.quantity}|${movDate}`;

          if (mode === "merge" && existingMovKeys.has(dedupeKey)) continue; // Already exists

          await storage.createInventoryMovement({
            inventoryId: newInventoryId,
            productName: mov.productName || "",
            type: mov.type,
            quantity: Number(mov.quantity),
            date: movDate,
            month: mov.month || new Date(movDate + "T12:00:00").toLocaleString("pt-BR", { month: "long", year: "numeric" }),
            notes: mov.notes || "",
          });
          movementsRestored++;
        }
      }

      if (preserveItemQuantitiesAfterMovements) {
        for (const item of data.items) {
          const key = String(item.name || "").toLowerCase().trim();
          const inventoryId = nameToNewId.get(key);
          if (!inventoryId) continue;
          await storage.updateInventoryItem(inventoryId, {
            quantity: item.quantity ?? 0,
            minStock: item.minStock ?? 5,
            pricePerUnit: normalizeMoneyReais(item.pricePerUnit),
          });
        }
      }

      res.json({
        message: `Estoque restaurado com sucesso. ${movementsRestored} movimentação(ões) recuperada(s).`,
        updated, created, deleted,
        movementsRestored, movementsDeleted,
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/backup/restore/produtos", requireAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      if (!data?.products) return res.status(400).json({ message: "Formato de backup inválido" });
      const existing = await storage.getProducts();
      const byName = new Map(existing.map((p: any) => [p.name.toLowerCase().trim(), p]));
      let updated = 0, created = 0;
      for (const p of data.products) {
        const key = String(p.name).toLowerCase().trim();
        const found = byName.get(key);
        if (found) {
          await storage.updateProduct(found.id, normalizeProductPricingPayload({
            description: p.description ?? found.description,
            category: p.category ?? found.category,
            brand: p.brand ?? found.brand,
            unit: p.unit ?? found.unit,
            salePrice: p.salePrice ?? found.salePrice,
            commission: p.commission ?? found.commission,
            maxDiscount: p.maxDiscount ?? found.maxDiscount,
            active: p.active ?? found.active,
          }, found));
          updated++;
        } else {
          await storage.createProduct(normalizeProductPricingPayload({
            name: p.name,
            description: p.description || "",
            category: p.category || "Sem Categoria",
            brand: p.brand || "",
            unit: p.unit || "un",
            salePrice: p.salePrice ?? 0,
            commission: p.commission ?? 0,
            maxDiscount: p.maxDiscount ?? 0,
            active: p.active ?? true,
          }));
          created++;
        }
      }
      res.json({ message: "Catálogo de produtos restaurado com sucesso", updated, created });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/backup/restore/servicos", requireAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      if (!data?.services) return res.status(400).json({ message: "Formato de backup inválido" });
      const existing = await storage.getServices();
      const byName = new Map(existing.map((s: any) => [s.name.toLowerCase().trim(), s]));
      let updated = 0, created = 0;
      for (const s of data.services) {
        const key = String(s.name).toLowerCase().trim();
        const found = byName.get(key);
        if (found) {
          await storage.updateService(found.id, normalizeServicePricingPayload({
            description: s.description ?? found.description,
            pricePerUnit: s.pricePerUnit ?? found.pricePerUnit,
            laborCostPerM2: s.laborCostPerM2 ?? found.laborCostPerM2,
            transportCostPerM2: s.transportCostPerM2 ?? found.transportCostPerM2,
            materialConsumptionPerM2: s.materialConsumptionPerM2 ?? found.materialConsumptionPerM2,
            serviceMaterials: s.serviceMaterials ?? found.serviceMaterials,
          }, found));
          updated++;
        } else {
          await storage.createService(normalizeServicePricingPayload({
            name: s.name,
            description: s.description || "",
            pricePerUnit: s.pricePerUnit ?? 0,
            laborCostPerM2: s.laborCostPerM2 ?? 0,
            transportCostPerM2: s.transportCostPerM2 ?? 0,
            materialConsumptionPerM2: s.materialConsumptionPerM2 ?? 0,
            serviceMaterials: s.serviceMaterials ?? null,
          }));
          created++;
        }
      }
      res.json({ message: "Catálogo de serviços restaurado com sucesso", updated, created });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/backup/restore/materiais", requireAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      if (!data?.withdrawals) return res.status(400).json({ message: "Formato de backup inválido" });

      const existing = await storage.getMaterialWithdrawals();
      const existingKeys = new Set(existing.map((withdrawal: any) =>
        `${withdrawal.username}|${withdrawal.workOrderId || ""}|${withdrawal.notes || ""}`.toLowerCase()
      ));

      let created = 0;
      let skipped = 0;
      for (const withdrawal of data.withdrawals || []) {
        const key = `${withdrawal.username}|${withdrawal.workOrderId || ""}|${withdrawal.notes || ""}`.toLowerCase();
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }

        const items = Array.isArray(withdrawal.items) ? withdrawal.items : [];
        if (!withdrawal.username || items.length === 0) {
          skipped++;
          continue;
        }

        await storage.createMaterialWithdrawal({
          userId: Number(withdrawal.userId || 0),
          username: String(withdrawal.username),
          workOrderId: withdrawal.workOrderId ? Number(withdrawal.workOrderId) : null,
          jobId: withdrawal.jobId ? Number(withdrawal.jobId) : null,
          clientName: withdrawal.clientName || null,
          status: withdrawal.status || "pendente",
          withdrawalPhoto: withdrawal.withdrawalPhoto || "restauracao-assistida",
          withdrawalSignature: withdrawal.withdrawalSignature || "restauracao-assistida",
          notes: withdrawal.notes || "Origem: RESTAURACAO_ASSISTIDA_TEXTO",
          returnPhoto: withdrawal.returnPhoto || null,
          returnSignature: withdrawal.returnSignature || null,
          returnNotes: withdrawal.returnNotes || null,
        } as any, items.map((item: any) => ({
          withdrawalId: 0,
          inventoryId: Number(item.inventoryId || 0),
          productName: String(item.productName || item.materialName || item.name || "Material"),
          unit: item.unit || "unid",
          quantity: Math.ceil(Number(item.quantity || 0)),
          returnedQuantity: item.returnedQuantity ? Math.ceil(Number(item.returnedQuantity)) : null,
          condition: item.condition || "bom",
        })));
        created++;
      }

      res.json({ message: "Controle de materiais restaurado por texto assistido", updated: 0, created, skipped });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/backup/restore/financeiro", requireAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      const mode = (req.query.mode as string) || "merge";
      if (!data?.payments && !data?.transactions) return res.status(400).json({ message: "Formato de backup inválido" });

      let updated = 0, created = 0, deleted = 0;
      const payments: any[] = data.payments || [];
      const transactions: any[] = data.transactions || [];

      if (mode === "overwrite") {
        const currentPayments = await storage.getPayments();
        for (const payment of currentPayments) { await storage.deletePayment(payment.id); deleted++; }
        const currentTransactions = await storage.getTransactions();
        for (const transaction of currentTransactions) { await storage.deleteTransaction(transaction.id); deleted++; }
      }

      const existingPayments = mode === "merge" ? await storage.getPayments() : [];
      const paymentKeys = new Map(existingPayments.map((p: any) => [`${p.jobId}|${p.clientName}|${p.amount}|${p.paymentMethod}|${p.date}`.toLowerCase(), p]));
      for (const payment of payments) {
        const key = `${payment.jobId}|${payment.clientName}|${payment.amount}|${payment.paymentMethod}|${payment.date}`.toLowerCase();
        const found = paymentKeys.get(key);
        if (found) {
          await storage.updatePayment(found.id, {
            status: payment.status ?? found.status,
            notes: payment.notes ?? found.notes,
          });
          updated++;
        } else {
          await storage.createPayment({
            jobId: payment.jobId,
            clientName: payment.clientName || "",
            amount: payment.amount ?? 0,
            paymentMethod: payment.paymentMethod || "pix",
            date: payment.date ? new Date(payment.date) : undefined,
            status: payment.status || "completed",
            notes: payment.notes || "",
          });
          created++;
        }
      }

      const existingTransactions = mode === "merge" ? await storage.getTransactions() : [];
      const transactionKeys = new Set(existingTransactions.map((t: any) => `${t.type}|${t.category}|${t.amount}|${t.description}|${t.date}`.toLowerCase()));
      for (const transaction of transactions) {
        const key = `${transaction.type}|${transaction.category}|${transaction.amount}|${transaction.description}|${transaction.date}`.toLowerCase();
        if (mode === "merge" && transactionKeys.has(key)) continue;
        await storage.createTransaction({
          type: transaction.type || "outflow",
          category: transaction.category || "Geral",
          amount: transaction.amount ?? 0,
          description: transaction.description || "",
        });
        created++;
      }

      res.json({ message: "Financeiro restaurado com sucesso", updated, created, deleted });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Backup v2 — Clientes, Orçamentos, Ordens de Serviço, Garantias ───────────

  app.get("/api/backup/clientes", requireAdmin, async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json({ type: "clientes", version: "2.0", exportedAt: new Date().toISOString(), data: { clients } });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/backup/restore/clientes", requireAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      const mode = (req.query.mode as string) || "merge";
      if (!data?.clients) return res.status(400).json({ message: "Formato de backup inválido" });
      let updated = 0, created = 0, deleted = 0;

      if (mode === "overwrite") {
        const all = await storage.getClients();
        for (const c of all) { await storage.deleteClient(c.id); deleted++; }
        for (const c of data.clients) {
          await storage.createClient({ name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "", city: c.city || "", cpfCnpj: c.cpfCnpj || "", notes: c.notes || "" });
          created++;
        }
      } else {
        const existing = await storage.getClients();
        const byName = new Map(existing.map((c: any) => [c.name.toLowerCase().trim(), c]));
        for (const c of data.clients) {
          const key = String(c.name).toLowerCase().trim();
          const found = byName.get(key);
          if (found) {
            await storage.updateClient(found.id, { phone: c.phone ?? found.phone, email: c.email ?? found.email, address: c.address ?? found.address, city: c.city ?? found.city, cpfCnpj: c.cpfCnpj ?? found.cpfCnpj, notes: c.notes ?? found.notes });
            updated++;
          } else {
            await storage.createClient({ name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "", city: c.city || "", cpfCnpj: c.cpfCnpj || "", notes: c.notes || "" });
            created++;
          }
        }
      }
      res.json({ message: "Clientes restaurados com sucesso", updated, created, deleted });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/backup/orcamentos", requireAdmin, async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json({ type: "orcamentos", version: "2.0", exportedAt: new Date().toISOString(), data: { jobs } });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/backup/restore/orcamentos", requireAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      const mode = (req.query.mode as string) || "merge";
      if (!data?.jobs) return res.status(400).json({ message: "Formato de backup inválido" });
      let updated = 0, created = 0, deleted = 0;

      if (mode === "overwrite") {
        const all = await storage.getJobs();
        for (const j of all) { await storage.deleteJob(j.id); deleted++; }
        for (const j of data.jobs) {
          await storage.createJob({
            clientName: j.clientName,
            serviceType: j.serviceType || j.title || "Serviço",
            squareMeters: j.squareMeters ?? j.totalArea ?? 0,
            status: j.status || "Lead",
            calculatedPrice: j.calculatedPrice ?? j.totalPrice ?? 0,
            realPriceSold: j.realPriceSold ?? j.totalPrice ?? 0,
            inspectionNotes: j.inspectionNotes ?? j.description ?? j.notes ?? "",
          });
          created++;
        }
      } else {
        const existing = await storage.getJobs();
        const byKey = new Map(existing.map((j: any) => [`${j.clientName}||${j.serviceType}`.toLowerCase(), j]));
        for (const j of data.jobs) {
          const serviceType = j.serviceType || j.title || "Serviço";
          const key = `${j.clientName}||${serviceType}`.toLowerCase();
          const found = byKey.get(key);
          if (found) {
            await storage.updateJob(found.id, {
              status: j.status ?? found.status,
              calculatedPrice: j.calculatedPrice ?? j.totalPrice ?? found.calculatedPrice,
              realPriceSold: j.realPriceSold ?? j.totalPrice ?? found.realPriceSold,
              inspectionNotes: j.inspectionNotes ?? j.description ?? j.notes ?? found.inspectionNotes,
            });
            updated++;
          } else {
            await storage.createJob({
              clientName: j.clientName,
              serviceType,
              squareMeters: j.squareMeters ?? j.totalArea ?? 0,
              status: j.status || "Lead",
              calculatedPrice: j.calculatedPrice ?? j.totalPrice ?? 0,
              realPriceSold: j.realPriceSold ?? j.totalPrice ?? 0,
              inspectionNotes: j.inspectionNotes ?? j.description ?? j.notes ?? "",
            });
            created++;
          }
        }
      }
      res.json({ message: "Orçamentos restaurados com sucesso", updated, created, deleted });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/backup/ordens-servico", requireAdmin, async (req, res) => {
    try {
      const workOrders = await storage.getWorkOrders();
      res.json({ type: "ordens-servico", version: "2.0", exportedAt: new Date().toISOString(), data: { workOrders } });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/backup/restore/ordens-servico", requireAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      const mode = (req.query.mode as string) || "merge";
      if (!data?.workOrders) return res.status(400).json({ message: "Formato de backup inválido" });
      let updated = 0, created = 0, deleted = 0;

      if (mode === "overwrite") {
        const all = await storage.getWorkOrders();
        for (const w of all) { await storage.deleteWorkOrder(w.id); deleted++; }
        for (const w of data.workOrders) {
          await storage.createWorkOrder({ clientName: w.clientName, serviceType: w.serviceType || w.serviceName || "Serviço", status: w.status || "Planejada", scheduledDate: w.scheduledDate || null, teamAssigned: w.teamAssigned || w.technicianId?.toString() || null, notes: w.notes || "" });
          created++;
        }
      } else {
        const existing = await storage.getWorkOrders();
        const byKey = new Map(existing.map((w: any) => [`${w.clientName}||${w.serviceType}`.toLowerCase(), w]));
        for (const w of data.workOrders) {
          const serviceType = w.serviceType || w.serviceName || "Serviço";
          const key = `${w.clientName}||${serviceType}`.toLowerCase();
          const found = byKey.get(key);
          if (found) {
            await storage.updateWorkOrder(found.id, { status: w.status ?? found.status, notes: w.notes ?? found.notes });
            updated++;
          } else {
            await storage.createWorkOrder({ clientName: w.clientName, serviceType, status: w.status || "Planejada", scheduledDate: w.scheduledDate || null, teamAssigned: w.teamAssigned || w.technicianId?.toString() || null, notes: w.notes || "" });
            created++;
          }
        }
      }
      res.json({ message: "Ordens de Serviço restauradas com sucesso", updated, created, deleted });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/backup/garantias", requireAdmin, async (req, res) => {
    try {
      const warranties = await storage.getWarranties();
      res.json({ type: "garantias", version: "2.0", exportedAt: new Date().toISOString(), data: { warranties } });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/backup/restore/garantias", requireAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      const mode = (req.query.mode as string) || "merge";
      if (!data?.warranties) return res.status(400).json({ message: "Formato de backup inválido" });
      let updated = 0, created = 0, deleted = 0;

      if (mode === "overwrite") {
        const all = await storage.getWarranties();
        for (const w of all) { await storage.deleteWarranty(w.id); deleted++; }
        for (const w of data.warranties) {
          await storage.createWarranty({ clientName: w.clientName, clientPhone: w.clientPhone || "", serviceType: w.serviceType || w.serviceName || "Serviço", startDate: w.startDate || w.issueDate, endDate: w.endDate || w.expiryDate, status: w.status || "ativa", notes: w.notes || "" });
          created++;
        }
      } else {
        const existing = await storage.getWarranties();
        const byKey = new Map(existing.map((w: any) => [`${w.clientName}||${w.serviceType}`.toLowerCase(), w]));
        for (const w of data.warranties) {
          const serviceType = w.serviceType || w.serviceName || "Serviço";
          const key = `${w.clientName}||${serviceType}`.toLowerCase();
          const found = byKey.get(key);
          if (found) {
            await storage.updateWarranty(found.id, { status: w.status ?? found.status, notes: w.notes ?? found.notes });
            updated++;
          } else {
            await storage.createWarranty({ clientName: w.clientName, clientPhone: w.clientPhone || "", serviceType, startDate: w.startDate || w.issueDate, endDate: w.endDate || w.expiryDate, status: w.status || "ativa", notes: w.notes || "" });
            created++;
          }
        }
      }
      res.json({ message: "Garantias restauradas com sucesso", updated, created, deleted });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/backup/restore/pos-venda", requireAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      const mode = (req.query.mode as string) || "merge";
      if (!data?.warranties && !data?.npsResponses && !data?.maintenanceReminders) return res.status(400).json({ message: "Formato de backup inválido" });

      let updated = 0, created = 0, deleted = 0;
      const warranties: any[] = data.warranties || [];
      const npsResponses: any[] = data.npsResponses || [];
      const maintenanceReminders: any[] = data.maintenanceReminders || [];

      if (mode === "overwrite") {
        for (const reminder of await storage.getMaintenanceReminders()) { await storage.deleteMaintenanceReminder(reminder.id); deleted++; }
        for (const response of await storage.getNpsResponses()) { await storage.deleteNpsResponse(response.id); deleted++; }
        for (const warranty of await storage.getWarranties()) { await storage.deleteWarranty(warranty.id); deleted++; }
      }

      const existingWarranties = mode === "merge" ? await storage.getWarranties() : [];
      const warrantiesByKey = new Map(existingWarranties.map((w: any) => [`${w.clientName}||${w.serviceType}`.toLowerCase(), w]));
      for (const warranty of warranties) {
        const serviceType = warranty.serviceType || warranty.serviceName || "Serviço";
        const key = `${warranty.clientName}||${serviceType}`.toLowerCase();
        const found = warrantiesByKey.get(key);
        if (found) {
          await storage.updateWarranty(found.id, { status: warranty.status ?? found.status, notes: warranty.notes ?? found.notes });
          updated++;
        } else {
          await storage.createWarranty({
            workOrderId: warranty.workOrderId ?? null,
            jobId: warranty.jobId ?? null,
            clientName: warranty.clientName,
            clientPhone: warranty.clientPhone || "",
            serviceType,
            warrantyMonths: warranty.warrantyMonths ?? 12,
            startDate: warranty.startDate || warranty.issueDate,
            endDate: warranty.endDate || warranty.expiryDate,
            status: warranty.status || "ativa",
            notes: warranty.notes || "",
          });
          created++;
        }
      }

      const existingNps = mode === "merge" ? await storage.getNpsResponses() : [];
      const npsByKey = new Map(existingNps.map((n: any) => [`${n.clientName}|${n.jobId}|${n.workOrderId}|${n.sentAt}`.toLowerCase(), n]));
      for (const nps of npsResponses) {
        const key = `${nps.clientName}|${nps.jobId}|${nps.workOrderId}|${nps.sentAt}`.toLowerCase();
        const found = npsByKey.get(key);
        if (found) {
          await storage.updateNpsResponse(found.id, { score: nps.score ?? found.score, comment: nps.comment ?? found.comment, status: nps.status ?? found.status });
          updated++;
        } else {
          await storage.createNpsResponse({
            workOrderId: nps.workOrderId ?? null,
            jobId: nps.jobId ?? null,
            clientName: nps.clientName,
            clientPhone: nps.clientPhone || "",
            sentAt: nps.sentAt ? new Date(nps.sentAt) : undefined,
            respondedAt: nps.respondedAt ? new Date(nps.respondedAt) : undefined,
            score: nps.score ?? null,
            comment: nps.comment || "",
            status: nps.status || "pendente",
          });
          created++;
        }
      }

      const existingReminders = mode === "merge" ? await storage.getMaintenanceReminders() : [];
      const remindersByKey = new Map(existingReminders.map((m: any) => [`${m.clientName}|${m.jobId}|${m.workOrderId}|${m.completedDate}`.toLowerCase(), m]));
      for (const reminder of maintenanceReminders) {
        const key = `${reminder.clientName}|${reminder.jobId}|${reminder.workOrderId}|${reminder.completedDate}`.toLowerCase();
        const found = remindersByKey.get(key);
        if (found) {
          await storage.updateMaintenanceReminder(found.id, { notes: reminder.notes ?? found.notes, reminder12SentAt: reminder.reminder12SentAt ?? found.reminder12SentAt, reminder24SentAt: reminder.reminder24SentAt ?? found.reminder24SentAt });
          updated++;
        } else {
          await storage.createMaintenanceReminder({
            workOrderId: reminder.workOrderId ?? null,
            jobId: reminder.jobId ?? null,
            clientName: reminder.clientName,
            clientPhone: reminder.clientPhone || "",
            serviceType: reminder.serviceType || "",
            completedDate: reminder.completedDate || new Date().toISOString().slice(0, 10),
            reminder12SentAt: reminder.reminder12SentAt ? new Date(reminder.reminder12SentAt) : undefined,
            reminder24SentAt: reminder.reminder24SentAt ? new Date(reminder.reminder24SentAt) : undefined,
            notes: reminder.notes || "",
          });
          created++;
        }
      }

      res.json({ message: "Garantias/Pós-venda restaurado com sucesso", updated, created, deleted });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── Also support ?mode=overwrite for v1 restore endpoints ───────────────────

  // ─── WhatsApp Flows CRUD ──────────────────────────────────────────────────────
  app.get("/api/whatsapp-flows", requireAdmin, async (req, res) => {
    try { res.json(await storage.getWhatsappFlows()); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/whatsapp-flows", requireAdmin, async (req, res) => {
    try {
      const { name, trigger, triggerValue, message, messageType, buttons, includePdf, active, sortOrder } = req.body;
      if (!name || !trigger || !message) return res.status(400).json({ message: "name, trigger e message obrigatórios" });
      const f = await storage.createWhatsappFlow({ name, trigger, triggerValue: triggerValue || null, message, messageType: messageType || "text", buttons: buttons || null, includePdf: !!includePdf, active: active !== false, sortOrder: sortOrder || 0 });
      res.status(201).json(f);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.put("/api/whatsapp-flows/:id", requireAdmin, async (req, res) => {
    try {
      const { name, trigger, triggerValue, message, messageType, buttons, includePdf, active, sortOrder } = req.body;
      const upd: any = {};
      if (name !== undefined) upd.name = name;
      if (trigger !== undefined) upd.trigger = trigger;
      if (triggerValue !== undefined) upd.triggerValue = triggerValue;
      if (message !== undefined) upd.message = message;
      if (messageType !== undefined) upd.messageType = messageType;
      if (buttons !== undefined) upd.buttons = buttons;
      if (includePdf !== undefined) upd.includePdf = !!includePdf;
      if (active !== undefined) upd.active = !!active;
      if (sortOrder !== undefined) upd.sortOrder = sortOrder;
      const f = await storage.updateWhatsappFlow(Number(req.params.id), upd);
      if (!f) return res.status(404).json({ message: "Não encontrado" });
      res.json(f);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.delete("/api/whatsapp-flows/:id", requireAdmin, async (req, res) => {
    try { await storage.deleteWhatsappFlow(Number(req.params.id)); res.status(204).send(); }
    catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  return httpServer;
}
