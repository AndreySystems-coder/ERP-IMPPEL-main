import { Link } from "wouter";
import {
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
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
  ListChecks,
  MessageSquare,
  Package,
  PackageCheck,
  PenSquare,
  Scale,
  Settings,
  Shield,
  ShoppingCart,
  Tag,
  TrendingDown,
  UserCog,
  Users,
  Zap,
} from "lucide-react";
import { useUser } from "@/hooks/use-auth";
import { canAccess, type PermissionKey } from "@/lib/permissions";

interface HubItem {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  permission: PermissionKey;
  accent: {
    bar: string;
    icon: string;
  };
}

interface HubConfig {
  title: string;
  description: string;
  items: HubItem[];
}

const accents = {
  blue: { bar: "bg-blue-600", icon: "bg-blue-50 text-blue-700 ring-blue-100" },
  orange: { bar: "bg-orange-500", icon: "bg-orange-50 text-orange-700 ring-orange-100" },
  emerald: { bar: "bg-emerald-500", icon: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  violet: { bar: "bg-violet-500", icon: "bg-violet-50 text-violet-700 ring-violet-100" },
  slate: { bar: "bg-slate-600", icon: "bg-slate-50 text-slate-700 ring-slate-200" },
  cyan: { bar: "bg-cyan-500", icon: "bg-cyan-50 text-cyan-700 ring-cyan-100" },
  amber: { bar: "bg-amber-500", icon: "bg-amber-50 text-amber-700 ring-amber-100" },
  rose: { bar: "bg-rose-500", icon: "bg-rose-50 text-rose-700 ring-rose-100" },
};

function HubPage({ config }: { config: HubConfig }) {
  const { data: user } = useUser();
  const visibleItems = config.items.filter((item) => canAccess(user as any, item.permission));

  return (
    <div className="flex min-h-full flex-col gap-5">
      <div className="rounded-xl border border-primary/15 bg-gradient-to-r from-white via-white to-primary px-5 py-5 shadow-sm sm:px-6">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-display font-bold text-slate-950">{config.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{config.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => (
          <Link
            key={`${item.href}-${item.title}`}
            href={item.href}
            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <div className={`absolute inset-x-0 top-0 h-1 ${item.accent.bar}`} />
            <div className="flex min-h-[132px] flex-col justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`rounded-xl p-2.5 ring-1 ${item.accent.icon}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-primary">{item.title}</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Abrir</span>
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </Link>
        ))}
        {visibleItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            Nenhuma opção disponível para o seu cargo neste módulo.
          </div>
        )}
      </div>
    </div>
  );
}

export function CrmHub() {
  return (
    <HubPage
      config={{
        title: "CRM",
        description: "Centralize leads, contatos, clientes, conversas e ações comerciais.",
        items: [
          { title: "Clientes", description: "Cadastro e histórico básico dos clientes.", href: "/clients", icon: Building2, permission: "viewClients", accent: accents.blue },
          { title: "WhatsApp", description: "Pipeline, conversas, templates e próximas ações.", href: "/crm-whatsapp", icon: MessageSquare, permission: "viewCrmWhatsapp", accent: accents.emerald },
          { title: "Leads", description: "Entrada e acompanhamento de oportunidades.", href: "/leads", icon: Zap, permission: "viewLeads", accent: accents.orange },
        ],
      }}
    />
  );
}

export function QuotesHub() {
  return (
    <HubPage
      config={{
        title: "Orçamentos",
        description: "Crie propostas, calcule margens, aplique zonas e gere PDFs profissionais.",
        items: [
          { title: "Orçamentos", description: "Lista, criação, edição, PDF e envio por WhatsApp.", href: "/jobs", icon: Briefcase, permission: "viewQuotes", accent: accents.blue },
          { title: "Templates", description: "Layout, cores, seções e preview dos PDFs.", href: "/quote-templates", icon: FileText, permission: "viewQuoteTemplates", accent: accents.emerald },
          { title: "Calculadora de Preços", description: "Simulações rápidas de custo, margem e zona.", href: "/calculator", icon: Calculator, permission: "viewQuoteRules", accent: accents.orange },
        ],
      }}
    />
  );
}

export function WorksHub() {
  return (
    <HubPage
      config={{
        title: "Obras",
        description: "Acompanhe OS, registro de obra, agenda e execução em campo.",
        items: [
          { title: "Ordens de Serviço", description: "Criação, progresso, consumo, fotos e finalização.", href: "/work-orders", icon: ClipboardList, permission: "viewWorkOrders", accent: accents.blue },
          { title: "Calendário", description: "Programação semanal e diária das equipes.", href: "/calendar", icon: Calendar, permission: "viewCalendar", accent: accents.violet },
          { title: "Registro de Obras", description: "Apontamentos operacionais e fotos da execução.", href: "/registro-obra", icon: PenSquare, permission: "viewObraRegistro", accent: accents.orange },
        ],
      }}
    />
  );
}

export function InventoryHub() {
  return (
    <HubPage
      config={{
        title: "Estoque",
        description: "Controle saldo, contagens físicas e auditoria de movimentações.",
        items: [
          { title: "Estoque Atual", description: "Saldos, mínimos, status e resumo de entradas e saídas.", href: "/estoque/atual", icon: Package, permission: "viewInventoryCurrent", accent: accents.blue },
          { title: "Contagem Rápida", description: "Cole ou importe TXT para gerar ajustes com preview.", href: "/estoque/contagem-rapida", icon: ListChecks, permission: "viewInventoryCount", accent: accents.emerald },
          { title: "Movimentações", description: "Audite entradas, saídas, ajustes, datas e origens.", href: "/estoque/movimentacoes", icon: ShoppingCart, permission: "viewInventoryMovements", accent: accents.orange },
        ],
      }}
    />
  );
}

export function FinancialHub() {
  return (
    <HubPage
      config={{
        title: "Financeiro",
        description: "Fluxo de caixa, pagamentos, relatórios e configurações financeiras.",
        items: [
          { title: "Fluxo de Caixa", description: "Entradas, saídas e visão financeira geral.", href: "/financials", icon: DollarSign, permission: "viewCashFlow", accent: accents.blue },
          { title: "Pagamentos", description: "Parcelas, status e vínculos com orçamentos.", href: "/payments", icon: CreditCard, permission: "viewPayments", accent: accents.emerald },
          { title: "Configurações", description: "Formas, condições e regras de cobrança.", href: "/pagamentos-config", icon: Tag, permission: "viewFinancialSettings", accent: accents.orange },
          { title: "Relatórios", description: "DRE, conversão, obras por período e indicadores.", href: "/relatorios", icon: BarChart3, permission: "viewFinancials", accent: accents.violet },
        ],
      }}
    />
  );
}

export function TeamHub() {
  return (
    <HubPage
      config={{
        title: "Equipe",
        description: "Controle o trabalho em campo, materiais, produtividade, garantias e pós-venda.",
        items: [
          { title: "Produtividade", description: "Horas, área executada e desempenho por técnico.", href: "/equipe-produtividade", icon: Gauge, permission: "viewProductivity", accent: accents.blue },
          { title: "Garantias", description: "Certificados, prazos e incidentes de garantia.", href: "/garantias", icon: Shield, permission: "viewWarranties", accent: accents.emerald },
          { title: "Controle de Materiais", description: "Retirada, uso, devolução, fotos e assinatura.", href: "/controle-materiais", icon: PackageCheck, permission: "registrarMaterials", accent: accents.orange },
          { title: "Pós-venda & NPS", description: "Acompanhamento após obra e pesquisa de satisfação.", href: "/pos-venda", icon: Heart, permission: "viewPostSale", accent: accents.rose },
        ],
      }}
    />
  );
}

export function SettingsHub() {
  return (
    <HubPage
      config={{
        title: "Configurações",
        description: "Regras, usuários, catálogos, contratos, margens e parâmetros gerais.",
        items: [
          { title: "Status", description: "Etapas e status usados nos fluxos.", href: "/status-personalizados", icon: Hash, permission: "viewStatusSettings", accent: accents.blue },
          { title: "Usuários", description: "Acessos, cargos e permissões internas.", href: "/usuarios", icon: UserCog, permission: "viewUsers", accent: accents.slate },
          { title: "Catálogo de Serviços", description: "Serviços, custos por m² e descrições técnicas.", href: "/services", icon: Layers, permission: "viewQuoteRules", accent: accents.emerald },
          { title: "Custos", description: "Margens, custos, Zona A/B/C e acréscimos regionais.", href: "/custos-margens", icon: TrendingDown, permission: "viewCostSettings", accent: accents.orange },
          { title: "Regras", description: "Critérios para score e recomendação de serviços.", href: "/priority-rules", icon: Scale, permission: "viewPriorityRules", accent: accents.violet },
          { title: "Configurações Gerais", description: "Parâmetros gerais do ERP.", href: "/settings", icon: Settings, permission: "viewSettings", accent: accents.blue },
          { title: "Formas de Pagamento", description: "Meios de pagamento e ajustes.", href: "/formas-pagamento", icon: CreditCard, permission: "viewFinancialSettings", accent: accents.emerald },
          { title: "Condições de Pagamento", description: "Textos e condições exibidas nos PDFs.", href: "/condicoes-pagamento", icon: Clipboard, permission: "viewFinancialSettings", accent: accents.amber },
          { title: "Contratos", description: "Modelos, contratos e documentos comerciais.", href: "/contratos", icon: FileText, permission: "viewSettings", accent: accents.rose },
        ],
      }}
    />
  );
}

export function BackupsHub() {
  return (
    <HubPage
      config={{
        title: "Backups",
        description: "Escolha uma rotina segura: backup em PDF ou restauração controlada.",
        items: [
          { title: "Backup", description: "Gerar PDFs organizados dos dados para conferência e segurança.", href: "/backups/backup", icon: HardDrive, permission: "viewBackupGeneration", accent: accents.blue },
          { title: "Restauração", description: "Restaurar dados com PDF ou texto, sempre com preview antes de aplicar.", href: "/backups/restauracao", icon: Shield, permission: "viewRestore", accent: accents.orange },
        ],
      }}
    />
  );
}
