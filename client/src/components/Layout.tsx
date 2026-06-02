import React from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  Calendar as CalendarIcon,
  Clipboard,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  Gauge,
  HardDrive,
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
  PenSquare,
  Scale,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Tag,
  TrendingDown,
  Users,
  UserCog,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

import { useLogout, useUser } from "@/hooks/use-auth";

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

interface NavSection {
  label: string;
  path: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  items: NavItem[];
}

const ALL_SECTIONS: NavSection[] = [
  {
    label: "Início",
    path: "/",
    icon: LayoutDashboard,
    items: [{ name: "Dashboard", path: "/", icon: LayoutDashboard }],
  },
  {
    label: "CRM",
    path: "/crm",
    icon: MessageSquare,
    adminOnly: true,
    items: [
      { name: "CRM & WhatsApp", path: "/crm-whatsapp", icon: Zap },
      { name: "Leads", path: "/leads", icon: Users },
      { name: "Clientes", path: "/clients", icon: Building2 },
    ],
  },
  {
    label: "Orçamentos",
    path: "/orcamentos",
    icon: Briefcase,
    adminOnly: true,
    items: [
      { name: "Orçamentos", path: "/jobs", icon: Briefcase },
      { name: "Calculadora de Preços", path: "/calculator", icon: Calculator },
      { name: "Templates", path: "/quote-templates", icon: FileText },
    ],
  },
  {
    label: "Obras",
    path: "/obras",
    icon: ClipboardList,
    items: [
      { name: "Ordens de Serviço", path: "/work-orders", icon: ClipboardList, adminOnly: true },
      { name: "Registro de Obra", path: "/registro-obra", icon: PenSquare },
      { name: "Calendário", path: "/calendar", icon: CalendarIcon, adminOnly: true },
    ],
  },
  {
    label: "Estoque",
    path: "/estoque",
    icon: Package,
    adminOnly: true,
    items: [
      { name: "Estoque Atual", path: "/inventory", icon: Package },
      { name: "Contagem Física", path: "/contagem-fisica", icon: ListChecks },
      { name: "Catálogo de Produtos", path: "/catalog", icon: ShoppingCart },
    ],
  },
  {
    label: "Financeiro",
    path: "/financeiro",
    icon: DollarSign,
    adminOnly: true,
    items: [
      { name: "Fluxo de Caixa", path: "/financials", icon: DollarSign },
      { name: "Pagamentos", path: "/payments", icon: CreditCard },
      { name: "Config. Pagamentos", path: "/pagamentos-config", icon: Tag },
      { name: "Relatórios", path: "/relatorios", icon: BarChart3 },
    ],
  },
  {
    label: "Equipe",
    path: "/equipe",
    icon: Users,
    adminOnly: true,
    items: [
      { name: "Produtividade", path: "/equipe-produtividade", icon: Gauge },
      { name: "Controle de Materiais", path: "/controle-materiais", icon: PackageCheck },
      { name: "Pós-venda & NPS", path: "/pos-venda", icon: Heart },
      { name: "Garantias", path: "/garantias", icon: Shield },
    ],
  },
  {
    label: "Configurações",
    path: "/configuracoes",
    icon: Settings,
    adminOnly: true,
    items: [
      { name: "Status Personalizados", path: "/status-personalizados", icon: Hash },
      { name: "Regras de Prioridade", path: "/priority-rules", icon: Scale },
      { name: "Custos, Margens e Zonas", path: "/custos-margens", icon: TrendingDown },
      { name: "Catálogo de Serviços", path: "/services", icon: Layers },
      { name: "Usuários", path: "/usuarios", icon: UserCog },
      { name: "Configurações Gerais", path: "/settings", icon: Settings },
      { name: "Formas de Pagamento", path: "/formas-pagamento", icon: CreditCard },
      { name: "Condições de Pagamento", path: "/condicoes-pagamento", icon: Clipboard },
      { name: "Contratos", path: "/contratos", icon: FileText },
    ],
  },
  {
    label: "Backups",
    path: "/backups-hub",
    icon: HardDrive,
    adminOnly: true,
    items: [{ name: "Backups e Restauração", path: "/backups", icon: HardDrive }],
  },
];

const SEARCH_ITEMS = ALL_SECTIONS.flatMap((section) => [
  { name: section.label, path: section.path, icon: section.icon, adminOnly: section.adminOnly },
  ...section.items,
]);

function NavSectionGroup({
  section,
  location,
  isAdmin,
  onNavClick,
}: {
  section: NavSection;
  location: string;
  isAdmin: boolean;
  onNavClick: () => void;
}) {
  const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
  if (section.adminOnly && !isAdmin) return null;
  if (visibleItems.length === 0) return null;

  const hasActive =
    location === section.path ||
    visibleItems.some((item) => location === item.path || (item.path !== "/" && location.startsWith(item.path)));

  return (
    <Link
      href={section.path}
      onClick={onNavClick}
      className={`mb-1 flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
        hasActive ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <section.icon className={`h-4 w-4 shrink-0 ${hasActive ? "text-primary" : "text-slate-400"}`} />
      <span className="truncate">{section.label}</span>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { data: user, isLoading } = useUser();
  const logout = useLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [globalSearch, setGlobalSearch] = React.useState("");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const searchResults = SEARCH_ITEMS
    .filter((item) => !item.adminOnly || isAdmin)
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
            <p className="text-[10px] text-white/60">{isAdmin ? "Admin" : "Func"}</p>
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
            fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white
            shadow-[2px_0_15px_-3px_rgba(0,0,0,0.05)] transition-transform duration-300 ease-in-out
            lg:static lg:h-full lg:transform-none lg:shadow-none
            ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4">
            {ALL_SECTIONS.map((section) => (
              <NavSectionGroup
                key={section.label}
                section={section}
                location={location}
                isAdmin={isAdmin}
                onNavClick={() => setIsMobileMenuOpen(false)}
              />
            ))}
          </nav>

          <div className="border-t border-slate-100 p-4">
            <button
              onClick={() => logout.mutate()}
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair do sistema</span>
            </button>
          </div>
        </aside>

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
