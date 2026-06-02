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
}

interface HubConfig {
  title: string;
  description: string;
  items: HubItem[];
}

function HubPage({ config }: { config: HubConfig }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">ERP IMPPEL</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{config.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{config.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {config.items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900 group-hover:text-primary">{item.title}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
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
        title: "CRM e relacionamento",
        description: "Centralize leads, contatos, clientes, conversas e acoes comerciais.",
        items: [
          { title: "CRM & WhatsApp", description: "Pipeline, conversas, templates e proximas acoes.", href: "/crm-whatsapp", icon: MessageSquare },
          { title: "Leads", description: "Entrada e acompanhamento de oportunidades.", href: "/leads", icon: Zap },
          { title: "Clientes", description: "Cadastro e historico basico dos clientes.", href: "/clients", icon: Building2 },
        ],
      }}
    />
  );
}

export function QuotesHub() {
  return (
    <HubPage
      config={{
        title: "Orcamentos",
        description: "Crie propostas, calcule margens, aplique zonas e gere PDFs profissionais.",
        items: [
          { title: "Orcamentos", description: "Lista, criacao, edicao, PDF e envio por WhatsApp.", href: "/jobs", icon: Briefcase },
          { title: "Calculadora de Precos", description: "Simulacoes rapidas de custo, margem e zona.", href: "/calculator", icon: Calculator },
          { title: "Templates", description: "Layout, cores, secoes e preview dos PDFs.", href: "/quote-templates", icon: FileText },
        ],
      }}
    />
  );
}

export function WorksHub() {
  return (
    <HubPage
      config={{
        title: "Obras e execucao",
        description: "Acompanhe OS, registro de obra, agenda e execucao em campo.",
        items: [
          { title: "Ordens de Servico", description: "Criacao, progresso, consumo, fotos e finalizacao.", href: "/work-orders", icon: ClipboardList },
          { title: "Registro de Obra", description: "Apontamentos operacionais e fotos da execucao.", href: "/registro-obra", icon: PenSquare },
          { title: "Calendario", description: "Programacao semanal e diaria das equipes.", href: "/calendar", icon: Calendar },
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
        description: "Controle saldo, movimentacoes, contagem fisica e catalogo de produtos.",
        items: [
          { title: "Estoque Atual", description: "Produtos, entradas, saidas, ajustes e historico.", href: "/inventory", icon: Package },
          { title: "Contagem Fisica", description: "Conferencia rapida para reduzir erros de estoque.", href: "/contagem-fisica", icon: ListChecks },
          { title: "Catalogo de Produtos", description: "Produtos e materiais usados na operacao.", href: "/catalog", icon: ShoppingCart },
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
        description: "Fluxo de caixa, pagamentos, relatorios e configuracoes financeiras.",
        items: [
          { title: "Fluxo de Caixa", description: "Entradas, saidas e visao financeira geral.", href: "/financials", icon: DollarSign },
          { title: "Pagamentos", description: "Parcelas, status e vinculos com orcamentos.", href: "/payments", icon: CreditCard },
          { title: "Configuracoes de Pagamento", description: "Formas, condicoes e regras de cobranca.", href: "/pagamentos-config", icon: Tag },
          { title: "Relatorios", description: "DRE, conversao, obras por periodo e indicadores.", href: "/relatorios", icon: BarChart3 },
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
        description: "Controle o trabalho em campo, materiais, produtividade, garantias e pos-venda.",
        items: [
          { title: "Produtividade", description: "Horas, area executada e desempenho por tecnico.", href: "/equipe-produtividade", icon: Gauge },
          { title: "Controle de Materiais", description: "Retirada, uso, devolucao, fotos e assinatura.", href: "/controle-materiais", icon: PackageCheck },
          { title: "Pos-venda & NPS", description: "Acompanhamento apos obra e pesquisa de satisfacao.", href: "/pos-venda", icon: Heart },
          { title: "Garantias", description: "Certificados, prazos e incidentes de garantia.", href: "/garantias", icon: Shield },
        ],
      }}
    />
  );
}

export function SettingsHub() {
  return (
    <HubPage
      config={{
        title: "Configuracoes",
        description: "Regras, usuarios, catalogos, contratos, margens e parametros gerais.",
        items: [
          { title: "Custos, Margens e Zonas", description: "Margens, custos, Zona A/B/C e acrescimos regionais.", href: "/custos-margens", icon: TrendingDown },
          { title: "Status Personalizados", description: "Etapas e status usados nos fluxos.", href: "/status-personalizados", icon: Hash },
          { title: "Regras de Prioridade", description: "Criterios para score e recomendacao de servicos.", href: "/priority-rules", icon: Scale },
          { title: "Catalogo de Servicos", description: "Servicos, custos por m2 e descricoes tecnicas.", href: "/services", icon: Layers },
          { title: "Usuarios", description: "Acessos, cargos e permissoes internas.", href: "/usuarios", icon: UserCog },
          { title: "Configuracoes Gerais", description: "Parametros gerais do ERP.", href: "/settings", icon: Settings },
          { title: "Formas de Pagamento", description: "Meios de pagamento e ajustes.", href: "/formas-pagamento", icon: CreditCard },
          { title: "Condicoes de Pagamento", description: "Textos e condicoes exibidas nos PDFs.", href: "/condicoes-pagamento", icon: Clipboard },
          { title: "Contratos", description: "Modelos, contratos e documentos comerciais.", href: "/contratos", icon: FileText },
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
        description: "Backup, restauracao e exportacoes gerais ficam centralizados aqui.",
        items: [
          { title: "Backups e Restauracao", description: "Gerencie copias, restauracao e exportacoes do ERP.", href: "/backups", icon: HardDrive },
        ],
      }}
    />
  );
}
