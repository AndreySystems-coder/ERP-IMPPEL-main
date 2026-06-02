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

interface HubItem {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
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
  return (
    <div className="flex min-h-full flex-col gap-5">
      <div className="rounded-xl border border-primary/15 bg-gradient-to-r from-primary/10 via-white to-orange-50 px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Central do módulo</p>
            <h1 className="mt-1 text-3xl font-display font-bold text-slate-950">{config.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{config.description}</p>
          </div>
          <div className="hidden rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm sm:block">
            ERP IMPPEL
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {config.items.map((item) => (
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
          { title: "WhatsApp", description: "Pipeline, conversas, templates e próximas ações.", href: "/crm-whatsapp", icon: MessageSquare, accent: accents.emerald },
          { title: "Leads", description: "Entrada e acompanhamento de oportunidades.", href: "/leads", icon: Zap, accent: accents.orange },
          { title: "Clientes", description: "Cadastro e histórico básico dos clientes.", href: "/clients", icon: Building2, accent: accents.blue },
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
          { title: "Orçamentos", description: "Lista, criação, edição, PDF e envio por WhatsApp.", href: "/jobs", icon: Briefcase, accent: accents.blue },
          { title: "Calculadora de Preços", description: "Simulações rápidas de custo, margem e zona.", href: "/calculator", icon: Calculator, accent: accents.emerald },
          { title: "Templates", description: "Layout, cores, seções e preview dos PDFs.", href: "/quote-templates", icon: FileText, accent: accents.orange },
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
          { title: "Ordens de Serviço", description: "Criação, progresso, consumo, fotos e finalização.", href: "/work-orders", icon: ClipboardList, accent: accents.blue },
          { title: "Registro de Obras", description: "Apontamentos operacionais e fotos da execução.", href: "/registro-obra", icon: PenSquare, accent: accents.orange },
          { title: "Calendário", description: "Programação semanal e diária das equipes.", href: "/calendar", icon: Calendar, accent: accents.violet },
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
        description: "Controle saldo, movimentações, contagem física e catálogo de produtos.",
        items: [
          { title: "Estoque Atual", description: "Produtos, entradas, saídas, ajustes e histórico.", href: "/inventory", icon: Package, accent: accents.blue },
          { title: "Contagem Física", description: "Conferência rápida para reduzir erros de estoque.", href: "/contagem-fisica", icon: ListChecks, accent: accents.emerald },
          { title: "Movimentações", description: "Entradas, saídas e ajustes dentro do estoque.", href: "/inventory", icon: ShoppingCart, accent: accents.orange },
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
          { title: "Pagamentos", description: "Parcelas, status e vínculos com orçamentos.", href: "/payments", icon: CreditCard, accent: accents.emerald },
          { title: "Fluxo de Caixa", description: "Entradas, saídas e visão financeira geral.", href: "/financials", icon: DollarSign, accent: accents.blue },
          { title: "Configurações", description: "Formas, condições e regras de cobrança.", href: "/pagamentos-config", icon: Tag, accent: accents.orange },
          { title: "Relatórios", description: "DRE, conversão, obras por período e indicadores.", href: "/relatorios", icon: BarChart3, accent: accents.violet },
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
          { title: "Produtividade", description: "Horas, área executada e desempenho por técnico.", href: "/equipe-produtividade", icon: Gauge, accent: accents.blue },
          { title: "Controle de Materiais", description: "Retirada, uso, devolução, fotos e assinatura.", href: "/controle-materiais", icon: PackageCheck, accent: accents.orange },
          { title: "Pós-venda & NPS", description: "Acompanhamento após obra e pesquisa de satisfação.", href: "/pos-venda", icon: Heart, accent: accents.rose },
          { title: "Garantias", description: "Certificados, prazos e incidentes de garantia.", href: "/garantias", icon: Shield, accent: accents.emerald },
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
          { title: "Custos, Margens e Zonas", description: "Margens, custos, Zona A/B/C e acréscimos regionais.", href: "/custos-margens", icon: TrendingDown, accent: accents.orange },
          { title: "Status Personalizados", description: "Etapas e status usados nos fluxos.", href: "/status-personalizados", icon: Hash, accent: accents.blue },
          { title: "Regras de Prioridade", description: "Critérios para score e recomendação de serviços.", href: "/priority-rules", icon: Scale, accent: accents.violet },
          { title: "Catálogo de Serviços", description: "Serviços, custos por m² e descrições técnicas.", href: "/services", icon: Layers, accent: accents.emerald },
          { title: "Usuários", description: "Acessos, cargos e permissões internas.", href: "/usuarios", icon: UserCog, accent: accents.slate },
          { title: "Configurações Gerais", description: "Parâmetros gerais do ERP.", href: "/settings", icon: Settings, accent: accents.blue },
          { title: "Formas de Pagamento", description: "Meios de pagamento e ajustes.", href: "/formas-pagamento", icon: CreditCard, accent: accents.emerald },
          { title: "Condições de Pagamento", description: "Textos e condições exibidas nos PDFs.", href: "/condicoes-pagamento", icon: Clipboard, accent: accents.amber },
          { title: "Contratos", description: "Modelos, contratos e documentos comerciais.", href: "/contratos", icon: FileText, accent: accents.rose },
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
        description: "Backup, restauração e exportações gerais ficam centralizados aqui.",
        items: [
          { title: "Backup", description: "Crie e acompanhe cópias de segurança do ERP.", href: "/backups", icon: HardDrive, accent: accents.blue },
          { title: "Restauração", description: "Acesse a central para restaurar dados quando necessário.", href: "/backups", icon: Shield, accent: accents.orange },
          { title: "Exportações", description: "Centralize exportações administrativas e arquivos de apoio.", href: "/backups", icon: FileText, accent: accents.emerald },
        ],
      }}
    />
  );
}
