import React from "react";
import { useLocation } from "wouter";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Calendar as CalendarIcon,
  Clipboard,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  Gauge,
  Hash,
  Heart,
  Layers,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquare,
  Package,
  PackageCheck,
  Scale,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Palette,
  PhoneCall,
  Tag,
  TrendingDown,
  Users,
  UserCog,
  Wrench,
} from "lucide-react";
import { motion } from "framer-motion";

import { useLogout, useUser } from "@/hooks/use-auth";
import { canAccessAny, type PermissionKey } from "@/lib/permissions";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  permission?: PermissionKey;
}

interface NavSection {
  label: string;
  path: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  permission?: PermissionKey;
  items: NavItem[];
}

const ALL_SECTIONS: NavSection[] = [
  {
    label: "Início",
    path: "/",
    icon: LayoutDashboard,
    permission: "viewDashboard",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "Calendário", path: "/calendar", icon: CalendarIcon, permission: "viewCalendar" },
    ],
  },
  {
    label: "Marketing",
    path: "/marketing",
    icon: Palette,
    adminOnly: true,
    permission: "viewMarketingContent",
    items: [
      { name: "Todos", path: "/marketing", icon: Palette, permission: "viewMarketingContent" },
      { name: "Planejamento de Conteúdo", path: "/marketing-conteudo", icon: MessageSquare, permission: "viewMarketingContent" },
      { name: "Identidade e Conteúdo", path: "/identidade-visual", icon: Palette, permission: "viewVisualIdentity" },
    ],
  },
  {
    label: "Atendimento",
    path: "/crm",
    icon: PhoneCall,
    adminOnly: true,
    permission: "viewCrm",
    items: [
      { name: "Todos", path: "/crm", icon: PhoneCall, permission: "viewCrm" },
      { name: "Sistema Comercial", path: "/sistema-comercial", icon: BarChart3, permission: "viewCommercialSystem" },
      { name: "Leads", path: "/leads", icon: Users, permission: "viewLeads" },
      { name: "Clientes", path: "/clients", icon: Building2, permission: "viewClients" },
      { name: "CRM e WhatsApp", path: "/crm-whatsapp", icon: MessageSquare, permission: "viewCrmWhatsapp" },
    ],
  },
  {
    label: "Orçamentos",
    path: "/orcamentos",
    icon: Briefcase,
    adminOnly: true,
    permission: "viewQuotes",
    items: [
      { name: "Todos", path: "/orcamentos", icon: Briefcase, permission: "viewQuotes" },
      { name: "Orçamentos", path: "/jobs", icon: Briefcase, permission: "viewQuotes" },
      { name: "Catálogo de Materiais", path: "/catalog", icon: Package, permission: "viewQuoteRules" },
      { name: "Catálogo de Serviços", path: "/services", icon: Layers, permission: "viewQuoteRules" },
      { name: "Cálculo de Preço", path: "/calculator", icon: TrendingDown, permission: "viewQuotes" },
      { name: "Governança Comercial", path: "/governanca-comercial", icon: Scale, permission: "viewSettings" },
      { name: "Templates de Orçamento", path: "/quote-templates", icon: FileText, permission: "viewQuoteTemplates" },
    ],
  },
  {
    label: "Planejamento",
    path: "/planejamento-obras",
    icon: ClipboardList,
    permission: "viewWorks",
    items: [
      { name: "Todos", path: "/planejamento-obras", icon: ClipboardList, permission: "viewWorkOrders" },
      { name: "Ordem de Serviço", path: "/work-orders", icon: ClipboardList, permission: "viewWorkOrders" },
      { name: "Agenda", path: "/calendar", icon: CalendarIcon, permission: "viewCalendar" },
    ],
  },
  {
    label: "Execução",
    path: "/execucao-qualidade",
    icon: Clipboard,
    permission: "viewWorks",
    items: [
      { name: "Todos", path: "/execucao-qualidade", icon: Clipboard, permission: "viewWorkOrders" },
      { name: "Ordens de Serviço", path: "/work-orders", icon: ClipboardList, permission: "viewWorkOrders" },
      { name: "Registro de Obra", path: "/registro-obra", icon: Clipboard, permission: "viewWorks" },
    ],
  },
  {
    label: "Materiais",
    path: "/materiais-equipamentos",
    icon: Package,
    adminOnly: true,
    permission: "viewInventory",
    items: [
      { name: "Todos", path: "/materiais-equipamentos", icon: Package, permission: "viewInventory" },
      { name: "Controle de Materiais", path: "/controle-materiais", icon: PackageCheck, permission: "registrarMaterials" },
      { name: "Estoque Atual", path: "/estoque/atual", icon: Package, permission: "viewInventoryCurrent" },
      { name: "Ferramentas", path: "/estoque/ferramentas", icon: Wrench, permission: "viewInventoryCurrent" },
      { name: "Venda de Materiais", path: "/vendas-materiais", icon: ShoppingCart, permission: "viewMaterialSales" },
      { name: "Contagem Rápida", path: "/estoque/contagem-rapida", icon: ListChecks, permission: "viewInventoryCount" },
    ],
  },
  {
    label: "Financeiro",
    path: "/financeiro",
    icon: DollarSign,
    adminOnly: true,
    permission: "viewFinancials",
    items: [
      { name: "Todos", path: "/financeiro", icon: DollarSign, permission: "viewFinancials" },
      { name: "Fluxo de Caixa", path: "/financials", icon: DollarSign, permission: "viewCashFlow" },
      { name: "Pagamentos", path: "/payments", icon: CreditCard, permission: "viewPayments" },
      { name: "Relatórios Financeiros", path: "/relatorios", icon: BarChart3, permission: "viewFinancials" },
      { name: "Contratos", path: "/contratos", icon: FileText, permission: "viewSettings" },
      { name: "Config. Pagamentos", path: "/pagamentos-config", icon: Tag, permission: "viewFinancialSettings" },
    ],
  },
  {
    label: "Equipe",
    path: "/equipe",
    icon: Users,
    adminOnly: true,
    permission: "viewTeam",
    items: [
      { name: "Todos", path: "/equipe", icon: Users, permission: "viewTeam" },
      { name: "Usuários e Cargos", path: "/usuarios", icon: UserCog, permission: "viewUsers" },
      { name: "Produtividade", path: "/equipe-produtividade", icon: Gauge, permission: "viewProductivity" },
      { name: "Como Trabalhar", path: "/como-trabalhar", icon: BookOpen, permission: "viewHelpCenter" },
    ],
  },
  {
    label: "Pós-venda",
    path: "/pos-venda-hub",
    icon: Heart,
    adminOnly: true,
    permission: "viewPostSale",
    items: [
      { name: "Todos", path: "/pos-venda-hub", icon: Heart, permission: "viewPostSale" },
      { name: "Garantias", path: "/garantias", icon: Shield, permission: "viewWarranties" },
      { name: "Pós-venda & NPS", path: "/pos-venda", icon: Heart, permission: "viewPostSale" },
    ],
  },
  {
    label: "Gestão",
    path: "/gestao",
    icon: Settings,
    adminOnly: true,
    permission: "viewSettings",
    items: [
      { name: "Todos", path: "/gestao", icon: Settings, permission: "viewSettings" },
      { name: "Configurações Gerais", path: "/settings", icon: Settings, permission: "viewSettings" },
      { name: "Status Personalizados", path: "/status-personalizados", icon: Hash, permission: "viewStatusSettings" },
      { name: "Regras de Prioridade", path: "/priority-rules", icon: Scale, permission: "viewPriorityRules" },
      { name: "Formas de Pagamento", path: "/formas-pagamento", icon: CreditCard, permission: "viewFinancialSettings" },
      { name: "Condições de Pagamento", path: "/condicoes-pagamento", icon: Clipboard, permission: "viewFinancialSettings" },
      { name: "Custos e Margens", path: "/custos-margens", icon: TrendingDown, permission: "viewCostSettings" },
    ],
  },
  {
    label: "Backups",
    path: "/backups-hub",
    icon: FileText,
    adminOnly: true,
    permission: "viewBackups",
    items: [
      { name: "Todos", path: "/backups-hub", icon: FileText, permission: "viewBackups" },
      { name: "Backup", path: "/backups/backup", icon: FileText, permission: "viewBackupGeneration" },
      { name: "Restauração", path: "/backups/restauracao", icon: Shield, permission: "viewRestore" },
    ],
  },
];

const SEARCH_ITEMS = ALL_SECTIONS.flatMap((section) => [
  { name: section.label, path: section.path, icon: section.icon, adminOnly: section.adminOnly },
  ...section.items,
]);

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { data: user, isLoading } = useUser();
  const logout = useLogout();
  const [globalSearch, setGlobalSearch] = React.useState("");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const userTitle = (user as any)?.jobTitle || (user as any)?.roleLabel || (isAdmin ? "Administrador" : "Funcionário");
  const visibleSections = ALL_SECTIONS.filter((section) => {
    const sectionPermissions = [section.permission, ...section.items.map((item) => item.permission)].filter(Boolean) as PermissionKey[];
    return canAccessAny(user, sectionPermissions);
  });
  const visibleSearchItems = visibleSections.flatMap((section) => [
    { name: section.label, path: section.path, icon: section.icon, permission: section.permission },
    ...section.items,
  ]);
  const searchResults = SEARCH_ITEMS
    .filter((item) => visibleSearchItems.some((visible) => visible.path === item.path && visible.name === item.name))
    .filter((item) => item.name.toLowerCase().includes(globalSearch.trim().toLowerCase()))
    .slice(0, 6);

  const goToResult = (path: string) => {
    navigate(path);
    setGlobalSearch("");
  };

  const sidebarLinks = visibleSections.map((section) => {
    const hasActive = location === section.path || (section.path !== "/" && location.startsWith(section.path));
    return {
      label: section.label,
      href: section.path,
      icon: <section.icon className={`h-5 w-5 shrink-0 ${hasActive ? "text-primary" : "text-neutral-700 dark:text-neutral-200"}`} />,
    };
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background font-sans">
      <header className="relative z-50 flex h-14 shrink-0 items-center justify-between bg-primary px-4 text-primary-foreground shadow-sm sm:px-6">
        <div className="flex items-center gap-4">
          <div className="font-display flex items-center gap-1 text-lg font-bold tracking-tight">
            <span className="text-white">IMPP</span>
            <span className="text-accent">EL</span>
          </div>
        </div>

        <div className="hidden w-full max-w-md items-center px-8 md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) goToResult(searchResults[0].path);
              }}
              placeholder="Buscar módulo..."
              className="h-8 w-full rounded-full border-white/10 bg-white/10 pl-9 pr-4 text-sm text-white transition-all placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            {globalSearch.trim() && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-10 z-50 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xl">
                {searchResults.map((item) => (
                  <button
                    key={`${item.name}-${item.path}`}
                    type="button"
                    onClick={() => goToResult(item.path)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <item.icon className="h-4 w-4 text-slate-400" />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold leading-tight text-white">{user?.username}</p>
            <p className="text-[10px] text-white/60">{userTitle}</p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-primary shadow-sm">
            {user?.username.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <Sidebar>
          <SidebarBody className="justify-between gap-10 border-r border-slate-200 bg-white dark:bg-neutral-900">
            <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
              <div className="mt-2 flex flex-col gap-1">
                {sidebarLinks.map((link) => (
                  <SidebarLink key={link.href} link={link} />
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <SidebarLink
                link={{ label: "Sair do sistema", href: "#", icon: <LogOut className="h-5 w-5 shrink-0 text-red-500" /> }}
                onClick={() => logout.mutate()}
                className="text-red-600 hover:text-red-700"
              />
            </div>
          </SidebarBody>
        </Sidebar>

        <main className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-slate-50/50 p-4 lg:px-8 lg:py-6">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mx-auto min-h-0 max-w-[1600px]"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
