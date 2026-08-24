import { Link } from "wouter";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Clipboard,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  Gauge,
  Hash,
  Heart,
  Layers,
  ListChecks,
  MessageSquare,
  Package,
  PackageCheck,
  Palette,
  Scale,
  Settings,
  Shield,
  ShoppingCart,
  Tag,
  TrendingDown,
  UserCog,
  Users,
  Wrench,
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
  owner: string;
  firstStep: string;
  sequence: string[];
  warning?: string;
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

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-400">Quem utiliza</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{config.owner}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-400">O que fazer primeiro</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{config.firstStep}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-400">Como trabalhar nesta função</p>
          <Link href="/como-trabalhar" className="mt-1 inline-flex text-sm font-semibold text-primary hover:underline">Abrir guia</Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase text-slate-400">Fluxo recomendado</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {config.sequence.map((step, index) => (
            <span key={step} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{index + 1}. {step}</span>
          ))}
        </div>
        {config.warning && <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">{config.warning}</p>}
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
        title: "Atendimento Comercial",
        description: "Receba contatos, qualifique oportunidades e acompanhe cada lead até orçamento, negociação, fechamento ou perda.",
        owner: "Comercial / Atendimento",
        firstStep: "Abrir Sistema Comercial e revisar novos contatos e follow-ups vencidos.",
        sequence: ["Novo contato", "Lead", "Qualificação", "Follow-up", "Negociação", "Fechado ou perdido"],
        items: [
          { title: "Sistema Comercial", description: "Visão geral, funil, leads, follow-ups, WhatsApp, marketing, indicadores e ajuda.", href: "/sistema-comercial", icon: BarChart3, permission: "viewCommercialSystem", accent: accents.violet },
          { title: "Clientes", description: "Cadastro e histórico básico dos clientes que já existem ou vieram do funil.", href: "/clients", icon: Building2, permission: "viewClients", accent: accents.blue },
          { title: "Leads", description: "Entrada e acompanhamento de oportunidades.", href: "/leads", icon: Users, permission: "viewLeads", accent: accents.orange },
          { title: "CRM e WhatsApp", description: "Conversas, templates e apoio ao atendimento.", href: "/crm-whatsapp", icon: MessageSquare, permission: "viewCrmWhatsapp", accent: accents.emerald },
        ],
      }}
    />
  );
}

export function MarketingHub() {
  return (
    <HubPage
      config={{
        title: "Marketing & Captação",
        description: "Organize conteúdo, identidade visual, biblioteca de mídia e origem de oportunidades sem misturar com negociação.",
        owner: "Marketing / Redes Sociais",
        firstStep: "Definir objetivo do conteúdo e conferir se a mídia possui autorização.",
        sequence: ["Ideia", "Canal", "Objetivo", "Mídia autorizada", "Rascunho", "Revisão", "Publicação manual"],
        warning: "IA, Waseller e Meta/Instagram dependem de credenciais reais; o ERP não afirma automação externa sem integração configurada.",
        items: [
          { title: "Planejamento de Conteúdo", description: "Rascunhos, calendário e ideias de conteúdo.", href: "/marketing-conteudo", icon: MessageSquare, permission: "viewMarketingContent", accent: accents.cyan },
          { title: "Identidade e Conteúdo", description: "Marca, fotos, autorizações, biblioteca visual, templates e antes/depois.", href: "/identidade-visual", icon: Palette, permission: "viewVisualIdentity", accent: accents.slate },
          { title: "Sistema Comercial", description: "Indicadores de origem e impacto dos leads.", href: "/sistema-comercial", icon: BarChart3, permission: "viewCommercialSystem", accent: accents.violet },
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
        description: "Transforme uma oportunidade qualificada em proposta comercial segura, com preço, margem, condições e aprovação.",
        owner: "Orçamentista / Administrativo Comercial",
        firstStep: "Confirmar cliente, necessidade e se o orçamento é preliminar ou após visita técnica.",
        sequence: ["Diagnóstico remoto ou visita", "Cliente", "Serviços", "Precificação", "Governança", "Proposta", "Aprovação"],
        items: [
          { title: "Orçamentos", description: "Lista, criação, edição, PDF e envio por WhatsApp.", href: "/jobs", icon: Briefcase, permission: "viewQuotes", accent: accents.blue },
          { title: "Calculadora de Preço", description: "Simule preço, margem e custos antes de fechar proposta.", href: "/calculator", icon: TrendingDown, permission: "viewQuotes", accent: accents.orange },
          { title: "Catálogo de Serviços", description: "Serviços, custos por m² e materiais usados na proposta.", href: "/services", icon: Layers, permission: "viewQuoteRules", accent: accents.emerald },
          { title: "Catálogo de Materiais", description: "Produtos/materiais com preço, comissão e desconto máximo.", href: "/catalog", icon: Package, permission: "viewQuoteRules", accent: accents.orange },
          { title: "Governança Comercial", description: "Alçadas, descontos, comissões, logística e aditivos.", href: "/governanca-comercial", icon: Scale, permission: "viewSettings", accent: accents.violet },
          { title: "Templates", description: "Layout, cores, seções e preview dos PDFs.", href: "/quote-templates", icon: FileText, permission: "viewQuoteTemplates", accent: accents.violet },
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
        description: "Planeje a execução depois que o orçamento foi aprovado: OS, agenda, equipe e preparação da obra.",
        owner: "Gestor de Obras / Operações",
        firstStep: "Abrir Ordens de Serviço e conferir agenda, equipe, escopo e materiais previstos.",
        sequence: ["Orçamento aprovado", "OS", "Agenda", "Equipe", "Materiais previstos", "Preparação", "Execução"],
        items: [
          { title: "Ordens de Serviço", description: "Criação, progresso, consumo, fotos e finalização.", href: "/work-orders", icon: ClipboardList, permission: "viewWorkOrders", accent: accents.blue },
          { title: "Calendário", description: "Programação semanal e diária das equipes.", href: "/calendar", icon: Calendar, permission: "viewCalendar", accent: accents.violet },
        ],
      }}
    />
  );
}

export function ExecutionQualityHub() {
  return (
    <HubPage
      config={{
        title: "Execução & Qualidade",
        description: "Registre a obra em campo e comprove que foi executada conforme padrão técnico.",
        owner: "Gestor de Obras / Equipe Técnica",
        firstStep: "Abrir a OS ou o Registro de Obra e conferir tarefas, evidências e pendências.",
        sequence: ["OS", "Registro diário", "Fotos/evidências", "Consumo real", "Ocorrências", "Checklist", "Inspeção", "Conclusão"],
        items: [
          { title: "Ordens de Serviço", description: "Execução, progresso, materiais, fotos e finalização.", href: "/work-orders", icon: ClipboardList, permission: "viewWorkOrders", accent: accents.blue },
          { title: "Registro de Obra", description: "Registro diário, observações, fotos e consumo real.", href: "/registro-obra", icon: Clipboard, permission: "viewWorks", accent: accents.orange },
          { title: "Qualidade das Obras", description: "Checklists, ocorrências, inspeções e bloqueios.", href: "/qualidade-obras", icon: ListChecks, permission: "viewWorkOrders", accent: accents.emerald },
        ],
      }}
    />
  );
}

export function InventoryHub() {
  return (
    <HubPage
      config={{
        title: "Materiais & Equipamentos",
        description: "Controle tudo que entra, sai, volta, fica em campo, é consumido, perdido, danificado ou enviado para manutenção.",
        owner: "Materiais e Equipamentos / Equipe Técnica",
        firstStep: "Conferir Estoque Atual e registrar qualquer alteração por movimentação ou controle de materiais.",
        sequence: ["Estoque atual", "Retirada", "Em campo", "Consumo ou devolução", "Dano/perda/manutenção", "Contagem", "Auditoria"],
        items: [
          { title: "Estoque Atual", description: "Saldos, mínimos, status e resumo de entradas e saídas.", href: "/estoque/atual", icon: Package, permission: "viewInventoryCurrent", accent: accents.blue },
          { title: "Ferramentas e Equipamentos", description: "Visualize retornáveis, responsáveis, danos, perdas e manutenção.", href: "/estoque/ferramentas", icon: Wrench, permission: "viewInventoryCurrent", accent: accents.slate },
          { title: "Movimentações de Estoque", description: "Audite entradas, saídas, ajustes, datas e origens.", href: "/estoque/movimentacoes", icon: ShoppingCart, permission: "viewInventoryMovements", accent: accents.orange },
          { title: "Controle de Materiais", description: "Retirada, uso, devolução, fotos e assinatura.", href: "/controle-materiais", icon: PackageCheck, permission: "registrarMaterials", accent: accents.amber },
          { title: "Contagem Rápida", description: "Auditoria física com processamento de lista e ajustes automáticos.", href: "/estoque/contagem-rapida", icon: ListChecks, permission: "viewInventoryCount", accent: accents.emerald },
          { title: "Venda de Materiais", description: "Carrinho, descontos autorizados e aprovação administrativa.", href: "/vendas-materiais", icon: ShoppingCart, permission: "viewMaterialSales", accent: accents.blue },
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
        description: "Acompanhe dinheiro, obrigações, contratos, pagamentos, recebimentos e relatórios financeiros autorizados.",
        owner: "Administrativo / Financeiro",
        firstStep: "Abrir Fluxo de Caixa e conferir vencimentos, entradas, saídas e pendências.",
        sequence: ["Previsão", "Vencimento", "Pagamento/recebimento", "Baixa", "Relatório", "Conferência"],
        items: [
          { title: "Fluxo de Caixa", description: "Entradas, saídas e visão financeira geral.", href: "/financials", icon: DollarSign, permission: "viewCashFlow", accent: accents.blue },
          { title: "Pagamentos", description: "Parcelas, status e vínculos com orçamentos.", href: "/payments", icon: CreditCard, permission: "viewPayments", accent: accents.emerald },
          { title: "Configurações", description: "Formas, condições e regras de cobrança.", href: "/pagamentos-config", icon: Tag, permission: "viewFinancialSettings", accent: accents.orange },
          { title: "Contratos", description: "Modelos e documentos administrativos.", href: "/contratos", icon: FileText, permission: "viewSettings", accent: accents.rose },
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
        description: "Organize pessoas, acessos, permissões, produtividade e treinamento para execução correta do ERP.",
        owner: "Admin / Gestão de Pessoas",
        firstStep: "Conferir usuários, cargos, permissões e orientar a equipe pelo Como Trabalhar.",
        sequence: ["Usuários", "Cargos", "Permissões", "Treinamento", "Produtividade", "Responsabilidades"],
        items: [
          { title: "Usuários e Cargos", description: "Acessos, cargos e permissões internas.", href: "/usuarios", icon: UserCog, permission: "viewUsers", accent: accents.slate },
          { title: "Produtividade", description: "Horas, área executada e desempenho por técnico.", href: "/equipe-produtividade", icon: Gauge, permission: "viewProductivity", accent: accents.blue },
          { title: "Como Trabalhar", description: "Guias rápidos e procedimentos aprovados.", href: "/como-trabalhar", icon: BookOpen, permission: "viewHelpCenter", accent: accents.slate },
        ],
      }}
    />
  );
}

export function PostSaleHub() {
  return (
    <HubPage
      config={{
        title: "Pós-venda & Relacionamento",
        description: "Acompanhe o cliente depois da entrega, garantias, manutenções, retorno e satisfação.",
        owner: "Pós-venda / Administrativo",
        firstStep: "Abrir garantias e pós-venda para conferir pendências depois da conclusão da obra.",
        sequence: ["Entrega", "Garantia", "Pesquisa", "Manutenção", "Histórico do cliente", "Indicadores"],
        items: [
          { title: "Garantias", description: "Certificados, prazos e incidentes de garantia.", href: "/garantias", icon: Shield, permission: "viewWarranties", accent: accents.emerald },
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
        title: "Gestão & Configurações",
        description: "Parâmetros estruturais do ERP: empresa, status, regras, pagamentos, custos, backups e integrações futuras.",
        owner: "Administrador",
        firstStep: "Alterar configurações somente depois de entender impacto em orçamento, financeiro, backup e permissões.",
        sequence: ["Configuração", "Permissão", "Validação", "Backup", "Uso controlado"],
        items: [
          { title: "Status", description: "Etapas e status usados nos fluxos.", href: "/status-personalizados", icon: Hash, permission: "viewStatusSettings", accent: accents.blue },
          { title: "Usuários", description: "Acessos, cargos e permissões internas.", href: "/usuarios", icon: UserCog, permission: "viewUsers", accent: accents.slate },
          { title: "Custos", description: "Margens, custos, Zona A/B/C e acréscimos regionais.", href: "/custos-margens", icon: TrendingDown, permission: "viewCostSettings", accent: accents.orange },
          { title: "Governança Comercial", description: "Alçadas, descontos, comissões, logística e aditivos.", href: "/governanca-comercial", icon: Scale, permission: "viewSettings", accent: accents.violet },
          { title: "Regras", description: "Critérios para score e recomendação de serviços.", href: "/priority-rules", icon: Scale, permission: "viewPriorityRules", accent: accents.violet },
          { title: "Configurações Gerais", description: "Parâmetros gerais do ERP.", href: "/settings", icon: Settings, permission: "viewSettings", accent: accents.blue },
          { title: "Formas de Pagamento", description: "Meios de pagamento e ajustes.", href: "/formas-pagamento", icon: CreditCard, permission: "viewFinancialSettings", accent: accents.emerald },
          { title: "Condições de Pagamento", description: "Textos e condições exibidas nos PDFs.", href: "/condicoes-pagamento", icon: Clipboard, permission: "viewFinancialSettings", accent: accents.amber },
          { title: "Contratos", description: "Modelos, contratos e documentos comerciais.", href: "/contratos", icon: FileText, permission: "viewSettings", accent: accents.rose },
          { title: "Backups", description: "Backup completo, exportação e restauração com preview.", href: "/backups-hub", icon: FileText, permission: "viewBackups", accent: accents.amber },
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
        description: "Crie cópias seguras, exporte módulos e restaure somente após validação, preview e confirmação.",
        owner: "Administrador",
        firstStep: "Criar backup completo antes de qualquer restauração ou limpeza operacional.",
        sequence: ["Backup completo", "Exportação modular", "Preview de restauração", "Conferência", "Confirmação", "Relatório"],
        items: [
          { title: "Criar Backup Completo", description: "Arquivo técnico restaurável com módulos suportados.", href: "/backups/backup", icon: FileText, permission: "viewBackups", accent: accents.blue },
          { title: "Exportação", description: "Baixar relatórios em PDF para conferência humana.", href: "/backups/exportacao", icon: FileText, permission: "viewExports", accent: accents.emerald },
          { title: "Restauração", description: "Importar PDFs gerados pelo ERP com preview antes de aplicar.", href: "/backups/restauracao", icon: Shield, permission: "viewRestore", accent: accents.orange },
        ],
      }}
    />
  );
}
