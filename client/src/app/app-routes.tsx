import type { ComponentType, ReactNode } from "react";

import BackupCenter, { BackupExportPage, BackupGenerationPage, BackupRestorePage } from "@/pages/BackupCenter";
import Calendar from "@/pages/Calendar";
import Catalog from "@/pages/Catalog";
import Clients from "@/pages/Clients";
import ContageEmFisica from "@/pages/ContageEmFisica";
import Contracts from "@/pages/Contracts";
import CostConfig from "@/pages/CostConfig";
import CrmWhatsapp from "@/pages/CrmWhatsapp";
import Dashboard from "@/pages/Dashboard";
import Financials from "@/pages/Financials";
import Inventory, { InventoryCurrentPage, InventoryMovementsPage, InventoryQuickCountPage } from "@/pages/Inventory";
import Jobs from "@/pages/Jobs";
import Leads from "@/pages/Leads";
import Login from "@/pages/Login";
import MaterialControl from "@/pages/MaterialControl";
import MobileJobDetail from "@/pages/mobile/MobileJobDetail";
import MobileJobs from "@/pages/mobile/MobileJobs";
import MobileLogin from "@/pages/mobile/MobileLogin";
import MobileNotesImport from "@/pages/MobileNotesImport";
import PagamentosConfig from "@/pages/PagamentosConfig";
import PaymentConditions from "@/pages/PaymentConditions";
import PaymentMethods from "@/pages/PaymentMethods";
import Payments from "@/pages/Payments";
import PostSale from "@/pages/PostSale";
import PriceCalculator from "@/pages/PriceCalculator";
import PriorityRules from "@/pages/PriorityRules";
import QuoteTemplates from "@/pages/QuoteTemplates";
import RegistroObra from "@/pages/RegistroObra";
import Reports from "@/pages/Reports";
import ServicesCatalog from "@/pages/ServicesCatalog";
import Settings from "@/pages/Settings";
import { BackupsHub, CrmHub, FinancialHub, InventoryHub, QuotesHub, SettingsHub, TeamHub, WorksHub } from "@/pages/SectionHub";
import StatusPersonalizados from "@/pages/StatusPersonalizados";
import TeamProductivity from "@/pages/TeamProductivity";
import ToolsAndEquipment from "@/pages/ToolsAndEquipment";
import Usuarios from "@/pages/Usuarios";
import Warranties from "@/pages/Warranties";
import WorkOrders from "@/pages/WorkOrders";
import MaterialSales from "@/pages/MaterialSales";
import HomeRedirect from "@/pages/HomeRedirect";
import AccessDenied from "@/pages/AccessDenied";

export type RouteAccess = "public" | "protected" | "admin";

export interface AppRoute {
  path: string;
  component: ComponentType;
  access: RouteAccess;
  withLayout?: boolean;
}

export const publicRoutes: AppRoute[] = [
  { path: "/login", component: Login, access: "public" },
];

export const mobileRoutes: AppRoute[] = [
  { path: "/mobile/login", component: MobileLogin, access: "public" },
  { path: "/mobile/jobs", component: MobileJobs, access: "public" },
  { path: "/mobile/job/:id", component: MobileJobDetail, access: "public" },
];

export const protectedRoutes: AppRoute[] = [
  { path: "/", component: HomeRedirect, access: "protected" },
  { path: "/sem-acesso", component: AccessDenied, access: "protected", withLayout: true },
  { path: "/registro-obra", component: RegistroObra, access: "protected", withLayout: true },
  { path: "/catalog", component: Catalog, access: "protected", withLayout: true },
  { path: "/vendas-materiais", component: MaterialSales, access: "protected", withLayout: true },
];

export const adminRoutes: AppRoute[] = [
  { path: "/dashboard", component: Dashboard, access: "admin", withLayout: true },
  { path: "/crm", component: CrmHub, access: "admin", withLayout: true },
  { path: "/orcamentos", component: QuotesHub, access: "admin", withLayout: true },
  { path: "/obras", component: WorksHub, access: "admin", withLayout: true },
  { path: "/estoque", component: InventoryHub, access: "admin", withLayout: true },
  { path: "/financeiro", component: FinancialHub, access: "admin", withLayout: true },
  { path: "/equipe", component: TeamHub, access: "admin", withLayout: true },
  { path: "/configuracoes", component: SettingsHub, access: "admin", withLayout: true },
  { path: "/backups-hub", component: BackupsHub, access: "admin", withLayout: true },
  { path: "/leads", component: Leads, access: "admin", withLayout: true },
  { path: "/crm-whatsapp", component: CrmWhatsapp, access: "admin", withLayout: true },
  { path: "/jobs", component: Jobs, access: "admin", withLayout: true },
  { path: "/work-orders", component: WorkOrders, access: "admin", withLayout: true },
  { path: "/calendar", component: Calendar, access: "admin", withLayout: true },
  { path: "/payments", component: Payments, access: "admin", withLayout: true },
  { path: "/services", component: ServicesCatalog, access: "admin", withLayout: true },
  { path: "/clients", component: Clients, access: "admin", withLayout: true },
  { path: "/calculator", component: PriceCalculator, access: "admin", withLayout: true },
  { path: "/estoque/atual", component: InventoryCurrentPage, access: "admin", withLayout: true },
  { path: "/estoque/ferramentas", component: ToolsAndEquipment, access: "admin", withLayout: true },
  { path: "/estoque/importacao-rapida", component: MobileNotesImport, access: "admin", withLayout: true },
  { path: "/estoque/contagem-rapida", component: InventoryQuickCountPage, access: "admin", withLayout: true },
  { path: "/estoque/movimentacoes", component: InventoryMovementsPage, access: "admin", withLayout: true },
  { path: "/inventory", component: Inventory, access: "admin", withLayout: true },
  { path: "/financials", component: Financials, access: "admin", withLayout: true },
  { path: "/settings", component: Settings, access: "admin", withLayout: true },
  { path: "/priority-rules", component: PriorityRules, access: "admin", withLayout: true },
  { path: "/custos-margens", component: CostConfig, access: "admin", withLayout: true },
  { path: "/usuarios", component: Usuarios, access: "admin", withLayout: true },
  { path: "/status-personalizados", component: StatusPersonalizados, access: "admin", withLayout: true },
  { path: "/formas-pagamento", component: PaymentMethods, access: "admin", withLayout: true },
  { path: "/condicoes-pagamento", component: PaymentConditions, access: "admin", withLayout: true },
  { path: "/pagamentos-config", component: PagamentosConfig, access: "admin", withLayout: true },
  { path: "/contratos", component: Contracts, access: "admin", withLayout: true },
  { path: "/garantias", component: Warranties, access: "admin", withLayout: true },
  { path: "/relatorios", component: Reports, access: "admin", withLayout: true },
  { path: "/equipe-produtividade", component: TeamProductivity, access: "admin", withLayout: true },
  { path: "/pos-venda", component: PostSale, access: "admin", withLayout: true },
  { path: "/contagem-fisica", component: ContageEmFisica, access: "admin", withLayout: true },
  { path: "/quote-templates", component: QuoteTemplates, access: "admin", withLayout: true },
  { path: "/controle-materiais", component: MaterialControl, access: "admin", withLayout: true },
  { path: "/backups/backup", component: BackupGenerationPage, access: "admin", withLayout: true },
  { path: "/backups/exportacao", component: BackupExportPage, access: "admin", withLayout: true },
  { path: "/backups/restauracao", component: BackupRestorePage, access: "admin", withLayout: true },
  { path: "/backups", component: BackupCenter, access: "admin", withLayout: true },
];

export const appRoutes = [
  ...publicRoutes,
  ...mobileRoutes,
  ...protectedRoutes,
  ...adminRoutes,
];

export function renderRouteComponent(route: AppRoute, wrappers: Record<RouteAccess, (children: ReactNode) => ReactNode>) {
  const Page = route.component;
  return wrappers[route.access](<Page />);
}
