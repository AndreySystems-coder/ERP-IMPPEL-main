export const ROLE_TECHNICAL_BY_LABEL: Record<string, string> = {
  "Administrativo / Financeiro": "administrativo_financeiro",
  "Administrativo /": "administrativo_financeiro",
  "Comercial / Atendimento": "comercial_atendimento",
  "Marketing / Redes Sociais": "marketing_redes_sociais",
  "Equipe Técnica": "equipe_tecnica",
  "Equipe Técnica (Obras / Serviços)": "equipe_tecnica",
  "Gestor de Obras": "gestor_obras",
  "Gestão de EPIs, Uniformes e Botas": "gestao_epis",
  "Gestão de EPIs,": "gestao_epis",
  "Materiais e Equipamentos": "materiais_equipamentos",
  "Gestão de Funcionários": "gestao_funcionarios",
  "Obras / Operações": "obras_operacoes",
};

export const DEFAULT_ROLE_PERMISSIONS: Array<{ name: string; label: string; permissions: Record<string, boolean> }> = [
  {
    name: "administrativo_financeiro",
    label: "Administrativo / Financeiro",
    permissions: {
      viewDashboard: true, viewFinancials: true, viewPayments: true, viewCashFlow: true, viewFinancialSettings: true,
      viewClients: true, viewQuotes: true, viewWorks: true, viewWorkOrders: true, viewBackups: true, viewExports: true, viewHelpCenter: true,
    },
  },
  {
    name: "comercial_atendimento",
    label: "Comercial / Atendimento",
    permissions: {
      viewCrm: true, viewCommercialSystem: true, viewLeads: true, viewCrmWhatsapp: true, viewClients: true, viewHelpCenter: true,
      viewQuotes: true, viewQuoteTemplates: true, viewQuoteRules: true, viewWorks: true, viewWorkOrders: true,
    },
  },
  {
    name: "marketing_redes_sociais",
    label: "Marketing / Redes Sociais",
    permissions: {
      viewDashboard: true, viewCrm: true, viewCommercialSystem: true, viewMarketingContent: true, viewLeads: true, viewCrmWhatsapp: true, viewClients: true, viewPostSale: true, viewHelpCenter: true,
    },
  },
  {
    name: "equipe_tecnica",
    label: "Equipe Técnica",
    permissions: {
      viewWorks: true, viewWorkOrders: true, viewObraRegistro: true,
      viewTeam: true, registrarMaterials: true, viewInventory: true, viewInventoryCurrent: true, viewInventoryMovements: true, viewHelpCenter: true,
    },
  },
  {
    name: "gestor_obras",
    label: "Gestor de Obras",
    permissions: {
      viewDashboard: true, viewWorks: true, viewWorkOrders: true, viewAllWorkOrders: true, editWorkOrders: true,
      viewObraRegistro: true, viewCalendar: true, viewTeam: true, viewProductivity: true, registrarMaterials: true,
      viewAllMaterials: true, viewInventory: true, viewInventoryCurrent: true, viewInventoryMovements: true, viewHelpCenter: true,
    },
  },
  {
    name: "gestao_epis",
    label: "Gestão de EPIs, Uniformes e Botas",
    permissions: {
      viewTeam: true, viewInventory: true, viewInventoryCurrent: true, viewInventoryMovements: true, registrarMaterials: true, viewHelpCenter: true,
    },
  },
  {
    name: "materiais_equipamentos",
    label: "Materiais e Equipamentos",
    permissions: {
      viewInventory: true, viewInventoryCurrent: true, viewInventoryMovements: true, editInventory: true,
      viewTeam: true, registrarMaterials: true, viewAllMaterials: true, viewHelpCenter: true,
    },
  },
  {
    name: "gestao_funcionarios",
    label: "Gestão de Funcionários",
    permissions: {
      viewUsers: true, viewTeam: true, viewProductivity: true, viewSettings: true, viewHelpCenter: true,
    },
  },
  {
    name: "obras_operacoes",
    label: "Obras / Operações",
    permissions: {
      viewWorks: true, viewWorkOrders: true, viewAllWorkOrders: true, editWorkOrders: true,
      viewObraRegistro: true, viewCalendar: true, viewTeam: true, registrarMaterials: true, viewAllMaterials: true, viewHelpCenter: true,
    },
  },
];

export function normalizeRoleName(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function defaultPermissionsForRole(nameOrLabel: string) {
  const normalized = normalizeRoleName(ROLE_TECHNICAL_BY_LABEL[nameOrLabel] || nameOrLabel);
  return DEFAULT_ROLE_PERMISSIONS.find(role => role.name === normalized)?.permissions || null;
}
