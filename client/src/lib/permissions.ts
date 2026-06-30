export type PermissionUser = {
  role?: string | null;
  permissions?: Record<string, boolean> | null;
};

export type PermissionKey =
  | "viewDashboard"
  | "viewCrm"
  | "viewCrmWhatsapp"
  | "viewLeads"
  | "viewClients"
  | "viewQuotes"
  | "viewQuoteTemplates"
  | "viewQuoteRules"
  | "viewWorks"
  | "viewWorkOrders"
  | "viewAllWorkOrders"
  | "editWorkOrders"
  | "viewObraRegistro"
  | "viewCalendar"
  | "viewInventory"
  | "viewInventoryCurrent"
  | "viewInventoryCount"
  | "viewInventoryMovements"
  | "editInventory"
  | "viewTeam"
  | "viewProductivity"
  | "registrarMaterials"
  | "viewAllMaterials"
  | "viewMaterialSales"
  | "createMaterialSales"
  | "approveMaterialSales"
  | "viewWarranties"
  | "viewPostSale"
  | "viewFinancials"
  | "viewPayments"
  | "viewCashFlow"
  | "viewFinancialSettings"
  | "viewSettings"
  | "viewCostSettings"
  | "viewStatusSettings"
  | "viewUsers"
  | "viewPriorityRules"
  | "viewBackups"
  | "viewBackupGeneration"
  | "viewRestore"
  | "viewExports";

const COMPATIBILITY: Partial<Record<PermissionKey, PermissionKey[]>> = {
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

const DEFAULT_EMPLOYEE_PERMISSIONS: PermissionKey[] = ["viewWorks", "viewObraRegistro", "viewTeam", "registrarMaterials"];

export function canAccess(user: PermissionUser | null | undefined, permission?: PermissionKey) {
  if (!permission) return true;
  if (user?.role === "admin") return true;

  const permissions = user?.permissions || {};
  if (permissions[permission]) return true;
  if (user?.role === "funcionario" && Object.keys(permissions).length === 0) {
    return DEFAULT_EMPLOYEE_PERMISSIONS.includes(permission);
  }

  return (COMPATIBILITY[permission] || []).some((key) => permissions[key]);
}

export function canAccessAny(user: PermissionUser | null | undefined, permissions: PermissionKey[]) {
  if (user?.role === "admin") return true;
  return permissions.some((permission) => canAccess(user, permission));
}

const PATH_PERMISSIONS: Array<{ path: string; permissions: PermissionKey[] }> = [
  { path: "/dashboard", permissions: ["viewDashboard"] },
  { path: "/crm", permissions: ["viewCrm", "viewLeads", "viewCrmWhatsapp", "viewClients"] },
  { path: "/leads", permissions: ["viewLeads"] },
  { path: "/crm-whatsapp", permissions: ["viewCrmWhatsapp"] },
  { path: "/clients", permissions: ["viewClients"] },
  { path: "/catalog", permissions: ["viewQuotes", "viewQuoteRules"] },
  { path: "/orcamentos", permissions: ["viewQuotes", "viewQuoteTemplates", "viewQuoteRules"] },
  { path: "/jobs", permissions: ["viewQuotes"] },
  { path: "/calculator", permissions: ["viewQuoteRules"] },
  { path: "/services", permissions: ["viewQuoteRules"] },
  { path: "/quote-templates", permissions: ["viewQuoteTemplates"] },
  { path: "/obras", permissions: ["viewWorks", "viewWorkOrders", "viewObraRegistro", "viewCalendar"] },
  { path: "/work-orders", permissions: ["viewWorkOrders"] },
  { path: "/calendar", permissions: ["viewCalendar"] },
  { path: "/registro-obra", permissions: ["viewObraRegistro"] },
  { path: "/estoque/atual", permissions: ["viewInventory", "viewInventoryCurrent"] },
  { path: "/estoque/contagem-rapida", permissions: ["viewInventory", "viewInventoryCount"] },
  { path: "/estoque/movimentacoes", permissions: ["viewInventory", "viewInventoryMovements"] },
  { path: "/estoque", permissions: ["viewInventory", "viewInventoryCurrent", "viewInventoryCount", "viewInventoryMovements"] },
  { path: "/inventory", permissions: ["viewInventory", "viewInventoryCurrent"] },
  { path: "/contagem-fisica", permissions: ["viewInventoryCount"] },
  { path: "/financeiro", permissions: ["viewFinancials", "viewPayments", "viewCashFlow", "viewFinancialSettings"] },
  { path: "/payments", permissions: ["viewPayments"] },
  { path: "/financials", permissions: ["viewFinancials", "viewCashFlow"] },
  { path: "/pagamentos-config", permissions: ["viewFinancialSettings"] },
  { path: "/relatorios", permissions: ["viewFinancials"] },
  { path: "/equipe", permissions: ["viewTeam", "viewProductivity", "registrarMaterials", "viewMaterialSales", "viewWarranties", "viewPostSale"] },
  { path: "/equipe-produtividade", permissions: ["viewProductivity"] },
  { path: "/controle-materiais", permissions: ["registrarMaterials"] },
  { path: "/vendas-materiais", permissions: ["viewMaterialSales", "createMaterialSales", "approveMaterialSales"] },
  { path: "/garantias", permissions: ["viewWarranties"] },
  { path: "/pos-venda", permissions: ["viewPostSale"] },
  { path: "/configuracoes", permissions: ["viewSettings", "viewCostSettings", "viewStatusSettings", "viewUsers", "viewPriorityRules"] },
  { path: "/custos-margens", permissions: ["viewCostSettings"] },
  { path: "/status-personalizados", permissions: ["viewStatusSettings"] },
  { path: "/priority-rules", permissions: ["viewPriorityRules"] },
  { path: "/usuarios", permissions: ["viewUsers"] },
  { path: "/settings", permissions: ["viewSettings"] },
  { path: "/formas-pagamento", permissions: ["viewFinancialSettings"] },
  { path: "/condicoes-pagamento", permissions: ["viewFinancialSettings"] },
  { path: "/contratos", permissions: ["viewSettings"] },
  { path: "/backups-hub", permissions: ["viewBackups", "viewBackupGeneration", "viewRestore", "viewExports"] },
  { path: "/backups/backup", permissions: ["viewBackups", "viewBackupGeneration"] },
  { path: "/backups/exportacao", permissions: ["viewBackups", "viewExports"] },
  { path: "/backups/restauracao", permissions: ["viewBackups", "viewRestore"] },
  { path: "/backups", permissions: ["viewBackups", "viewBackupGeneration", "viewRestore", "viewExports"] },
];

const LANDING_OPTIONS: Array<{ path: string; permissions: PermissionKey[] }> = [
  { path: "/controle-materiais", permissions: ["registrarMaterials"] },
  { path: "/vendas-materiais", permissions: ["viewMaterialSales", "createMaterialSales", "approveMaterialSales"] },
  { path: "/equipe", permissions: ["viewTeam", "viewProductivity", "viewMaterialSales", "viewWarranties", "viewPostSale"] },
  { path: "/orcamentos", permissions: ["viewQuotes", "viewQuoteTemplates", "viewQuoteRules"] },
  { path: "/obras", permissions: ["viewWorks", "viewWorkOrders", "viewObraRegistro", "viewCalendar"] },
  { path: "/estoque", permissions: ["viewInventory", "viewInventoryCurrent", "viewInventoryCount", "viewInventoryMovements"] },
  { path: "/crm", permissions: ["viewCrm", "viewLeads", "viewCrmWhatsapp", "viewClients"] },
  { path: "/financeiro", permissions: ["viewFinancials", "viewPayments", "viewCashFlow", "viewFinancialSettings"] },
  { path: "/backups-hub", permissions: ["viewBackups", "viewBackupGeneration", "viewRestore", "viewExports"] },
  { path: "/configuracoes", permissions: ["viewSettings", "viewCostSettings", "viewStatusSettings", "viewUsers", "viewPriorityRules"] },
  { path: "/dashboard", permissions: ["viewDashboard"] },
];

export function getDefaultLandingPath(user: PermissionUser | null | undefined) {
  if (!user) return "/login";
  if (user.role === "admin") return "/dashboard";
  return LANDING_OPTIONS.find(option => canAccessAny(user, option.permissions))?.path || "/sem-acesso";
}

export function permissionsForPath(path: string) {
  const exact = PATH_PERMISSIONS.find((entry) => entry.path === path);
  if (exact) return exact.permissions;
  return PATH_PERMISSIONS.find((entry) => entry.path !== "/" && path.startsWith(entry.path))?.permissions || [];
}
