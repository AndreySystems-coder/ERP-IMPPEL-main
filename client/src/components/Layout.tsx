import React from "react";
import { Link, useLocation } from "wouter";
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
  Menu,
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
import { canAccess, canAccessAny, type PermissionKey } from "@/lib/permissions";

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

function NavSectionGroup({
  section,
  location,
  user,
  onNavClick,
  collapsed,
}: {
  section: NavSection;
  location: string;
  user: any;
  onNavClick: () => void;
  collapsed: boolean;
}) {
  const visibleItems = section.items.filter((item) => canAccess(user, item.permission));
  const sectionPermissions = [section.permission, ...section.items.map((item) => item.permission)].filter(Boolean) as PermissionKey[];
  if (!canAccessAny(user, sectionPermissions)) return null;
  if (visibleItems.length === 0) return null;

  const hasActive =
    location === section.path ||
    visibleItems.some((item) => location === item.path || (item.path !== "/" && location.startsWith(item.path)));

  const iconClassName = `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
    hasActive ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
  }`;

  // Clique navega direto para o hub do módulo (que já lista os itens internos
  // como cards na tela) — a barra lateral nunca expande uma sublista aqui.
  if (collapsed) {
    // Barra compacta (dock): só o ícone sob o mouse mostra o rótulo, como uma
    // dica flutuante — o resto da barra fica parado, sem expandir junto.
    return (
      <div className="group/item relative mb-1 flex justify-center">
        <Link href={section.path} onClick={onNavClick} className={iconClassName}>
          <section.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </Link>
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/item:opacity-100">
          {section.label}
        </span>
      </div>
    );
  }

  return (
    <Link href={section.path} onClick={onNavClick} className={`mb-1 flex min-w-0 items-center gap-3 rounded-xl px-2 py-1.5 transition-colors ${hasActive ? "bg-slate-100" : "hover:bg-slate-50"}`}>
      <span className={iconClassName}>
        <section.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <span className={`truncate text-sm font-semibold ${hasActive ? "text-slate-900" : "text-slate-600"}`}>{section.label}</span>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { data: user, isLoading } = useUser();
  const logout = useLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [globalSearch, setGlobalSearch] = React.useState("");
  // No desktop a barra é sempre compacta (dock, só ícones com dica ao passar
  // o mouse); no mobile ela vira um menu off-canvas de largura total quando aberta.
  const effectiveCollapsed = !isMobileMenuOpen;

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
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background font-sans">
      <header className="relative z-50 flex h-14 shrink-0 items-center justify-between bg-primary px-4 text-primary-foreground shadow-sm sm:px-6">
        <div className="flex items-center gap-4">
          <button
            className="rounded-md p-1.5 -ml-1.5 text-primary-foreground/80 transition-colors hover:text-white lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            type="button"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-primary/20 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <aside
          className={`
            fixed left-0 top-14 bottom-0 z-[45] flex flex-col border-r border-slate-200 bg-white
            transition-[width] duration-200 ease-in-out
            lg:left-3 lg:top-[4.5rem] lg:bottom-3 lg:rounded-3xl lg:border lg:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.16)]
            ${effectiveCollapsed ? "w-16" : "w-64"}
            ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <nav className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
            {ALL_SECTIONS.map((section) => (
              <NavSectionGroup
                key={section.label}
                section={section}
                location={location}
                user={user}
                onNavClick={() => setIsMobileMenuOpen(false)}
                collapsed={effectiveCollapsed}
              />
            ))}
          </nav>

          <div className="border-t border-slate-100 p-3">
            {effectiveCollapsed ? (
              <div className="group/item relative flex justify-center">
                <button
                  onClick={() => logout.mutate()}
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
                <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/item:opacity-100">
                  Sair do sistema
                </span>
              </div>
            ) : (
              <button
                onClick={() => logout.mutate()}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <span>Sair do sistema</span>
              </button>
            )}
          </div>
        </aside>

        {/* Reserva o espaço da barra colapsada — a barra em si é fixed e nunca
            empurra o conteúdo, nem ao expandir no hover nem ao fixar aberta. */}
        <div className="hidden w-24 shrink-0 lg:block" />

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
