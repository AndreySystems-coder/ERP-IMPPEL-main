import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Briefcase, Calculator, Package, DollarSign,
  Settings, LogOut, Building2, Menu, Calendar as CalendarIcon, CreditCard,
  ShoppingCart, TrendingDown, ClipboardList, UserCog, Shield, MessageSquare,
  FileText, BarChart3, Heart, Clipboard, Tag, ChevronDown, ChevronRight,
  Warehouse, Scale, PenSquare, ListChecks, Layers, Wrench, ScrollText,
  FileSearch, Star, Hash, AlignLeft, Gauge, Zap, PackageCheck, HardDrive,
  Search, Bell
} from "lucide-react";
import { useUser, useLogout } from "@/hooks/use-auth";
import { motion } from "framer-motion";

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}
interface NavSection {
  label: string;
  emoji: string;
  adminOnly?: boolean;
  items: NavItem[];
}

const ALL_SECTIONS: NavSection[] = [
  {
    label: "Início",
    emoji: "🏠",
    items: [
      { name: "Dashboard", path: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "CRM & WhatsApp",
    emoji: "💬",
    adminOnly: true,
    items: [
      { name: "CRM & WhatsApp", path: "/crm-whatsapp", icon: Zap },
      { name: "Clientes", path: "/clients", icon: Building2 },
    ],
  },
  {
    label: "Orçamentos",
    emoji: "📋",
    adminOnly: true,
    items: [
      { name: "Orçamentos", path: "/jobs", icon: Briefcase },
      { name: "Calculadora de Preços", path: "/calculator", icon: Calculator },
      { name: "Templates de Orçamento", path: "/quote-templates", icon: FileText },
    ],
  },
  {
    label: "Obras",
    emoji: "🛠️",
    items: [
      { name: "Ordens de Serviço", path: "/work-orders", icon: ClipboardList, adminOnly: true },
      { name: "Registro de Obra", path: "/registro-obra", icon: PenSquare },
    ],
  },
  {
    label: "Estoque",
    emoji: "📦",
    adminOnly: true,
    items: [
      { name: "Estoque Atual", path: "/inventory", icon: Package },
      { name: "Contagem Física Rápida", path: "/contagem-fisica", icon: ListChecks },
      { name: "Controle de Materiais", path: "/controle-materiais", icon: PackageCheck },
    ],
  },
  {
    label: "Catálogo",
    emoji: "🧰",
    items: [
      { name: "Catálogo de Produtos", path: "/catalog", icon: ShoppingCart },
      { name: "Catálogo de Serviços", path: "/services", icon: Layers, adminOnly: true },
    ],
  },
  {
    label: "Financeiro",
    emoji: "💰",
    adminOnly: true,
    items: [
      { name: "Financeiro", path: "/financials", icon: DollarSign },
      { name: "Pagamentos", path: "/payments", icon: CreditCard },
      { name: "Config. de Pagamentos", path: "/pagamentos-config", icon: Tag },
      { name: "Custos e Margens", path: "/custos-margens", icon: TrendingDown },
      { name: "Relatórios Gerenciais", path: "/relatorios", icon: BarChart3 },
    ],
  },
  {
    label: "Documentos",
    emoji: "📄",
    adminOnly: true,
    items: [
      { name: "Contratos", path: "/contratos", icon: FileText },
      { name: "Garantias", path: "/garantias", icon: Shield },
    ],
  },
  {
    label: "Equipe & Pós-Venda",
    emoji: "👷",
    adminOnly: true,
    items: [
      { name: "Produtividade da Equipe", path: "/equipe-produtividade", icon: Gauge },
      { name: "Pós-Venda & NPS", path: "/pos-venda", icon: Heart },
    ],
  },
  {
    label: "Configurações",
    emoji: "⚙️",
    adminOnly: true,
    items: [
      { name: "Status Personalizados", path: "/status-personalizados", icon: Hash },
      { name: "Regras de Prioridade", path: "/priority-rules", icon: Scale },
      { name: "Usuários", path: "/usuarios", icon: UserCog },
      { name: "Configurações", path: "/settings", icon: Settings },
    ],
  },
  {
    label: "Backups",
    emoji: "💾",
    adminOnly: true,
    items: [
      { name: "Backups & Restauração", path: "/backups", icon: HardDrive },
    ],
  },
];

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
  const [collapsed, setCollapsed] = React.useState(false);

  const visibleItems = section.items.filter(i => !i.adminOnly || isAdmin);
  if (section.adminOnly && !isAdmin) return null;
  if (visibleItems.length === 0) return null;

  const hasActive = visibleItems.some(
    i => location === i.path || (i.path !== "/" && location.startsWith(i.path))
  );

  return (
    <div className="mb-2">
      <button
        onClick={() => setCollapsed(c => !c)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg group transition-colors ${hasActive ? "text-primary" : "text-slate-500 hover:text-slate-800"}`}
      >
        <span className="text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
          <span className="text-base leading-none">{section.emoji}</span>
          {section.label}
        </span>
        {collapsed
          ? <ChevronRight className="w-3 h-3 opacity-50" />
          : <ChevronDown className="w-3 h-3 opacity-50" />
        }
      </button>

      {!collapsed && (
        <div className="mt-1 space-y-0.5">
          {visibleItems.map(item => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onNavClick}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-lg transition-all duration-150 text-sm font-medium ${
                  isActive
                    ? "bg-slate-100 text-primary"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-slate-400"}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user, isLoading } = useUser();
  const logout = useLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">

      {/* Top Header */}
      <header className="h-14 bg-primary text-primary-foreground flex items-center justify-between px-4 sm:px-6 shrink-0 z-50 shadow-sm relative">
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-1.5 -ml-1.5 text-primary-foreground/80 hover:text-white rounded-md transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo in Header */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                 <path d="M12 2C12 2 4 7 4 13C4 17.4 7.6 21 12 21C16.4 21 20 17.4 20 13C20 7 12 2 12 2Z" fill="white" />
                 <path d="M12 6C12 6 7 9.5 7 13C7 15.8 9.2 18 12 18C14.8 18 17 15.8 17 13C17 9.5 12 6 12 6Z" fill="#F97316"/>
               </svg>
            </div>
            <div className="font-display font-bold text-lg tracking-tight flex items-center gap-1">
              <span className="text-white">IMPP</span><span className="text-accent">EL</span>
            </div>
          </div>
        </div>

        {/* Global Search (Visual placeholder for now) */}
        <div className="hidden md:flex items-center max-w-md w-full px-8">
           <div className="relative w-full">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                placeholder="Buscar no sistema..."
               className="w-full bg-white/10 border-white/10 text-white placeholder:text-white/40 h-8 rounded-full pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
             />
           </div>
        </div>

        {/* Right side Profile / Actions */}
        <div className="flex items-center gap-4">
          <button className="text-white/70 hover:text-white transition-colors relative">
             <Bell className="w-5 h-5" />
             <span className="absolute top-0 right-0 w-2 h-2 bg-accent rounded-full border border-primary"></span>
          </button>

          <div className="flex items-center gap-2 pl-4 border-l border-white/10">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight">{user?.username}</p>
              <p className="text-[10px] text-white/60">{isAdmin ? "Admin" : "Func"}</p>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-primary text-sm font-bold bg-white shrink-0 shadow-sm cursor-pointer`}>
              {user?.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar Clara (Light) */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col
          transition-transform duration-300 ease-in-out lg:transform-none shadow-[2px_0_15px_-3px_rgba(0,0,0,0.05)] lg:shadow-none
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
            {ALL_SECTIONS.map(section => (
              <NavSectionGroup
                key={section.label}
                section={section}
                location={location}
                isAdmin={isAdmin}
                onNavClick={() => setIsMobileMenuOpen(false)}
              />
            ))}
          </nav>

          {/* Logout Section at the bottom */}
          <div className="p-4 border-t border-slate-100">
             <button
              onClick={() => logout.mutate()}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair do sistema</span>
            </button>
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 p-4 lg:p-6 lg:px-8">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-[1600px] mx-auto h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
