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
  actions: string[];
  next: string;
  helpKey: string;
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

      {config.warning && <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">{config.warning}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item, index) => (
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
                  <span className="mb-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">Passo {String(index + 1).padStart(2, "0")}</span>
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

      <div className="flex justify-center pt-1">
        <Link
          href={`/como-trabalhar?funcao=${config.helpKey}`}
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-6 py-3 text-sm font-bold text-primary shadow-sm transition hover:border-primary/40 hover:shadow-md"
        >
          Como trabalhar nesta função
        </Link>
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
        owner: "Atendente comercial, vendedor ou responsável pelo CRM.",
        actions: ["Receber o contato vindo do Marketing ou indicação.", "Cadastrar ou atualizar cliente e lead.", "Qualificar necessidade, urgência e próximo passo.", "Registrar follow-up e conversas.", "Entregar lead qualificado para Orçamentos."],
        next: "Atendimento concluído → encaminhar lead qualificado para Orçamentos.",
        helpKey: "atendimento",
        items: [
          { title: "Sistema Comercial", description: "Todos, novos contatos, qualificação, funil, follow-ups e negociação.", href: "/sistema-comercial", icon: BarChart3, permission: "viewCommercialSystem", accent: accents.violet },
          { title: "Novos Leads", description: "Entrada e acompanhamento de oportunidades.", href: "/leads", icon: Users, permission: "viewLeads", accent: accents.orange },
          { title: "Clientes", description: "Cadastro e histórico básico dos clientes.", href: "/clients", icon: Building2, permission: "viewClients", accent: accents.blue },
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
        title: "Marketing e Captação",
        description: "Organize conteúdo, identidade visual, biblioteca de mídia e origem de oportunidades sem misturar com negociação.",
        owner: "Marketing, responsável por conteúdo ou responsável pela divulgação.",
        actions: ["Definir objetivo da campanha.", "Preparar conteúdo e mídias autorizadas.", "Revisar identidade, fotos, antes/depois e templates.", "Publicar ou programar divulgação fora do ERP.", "Registrar a origem dos contatos recebidos.", "Entregar contatos ao Atendimento."],
        next: "Marketing concluído → enviar contatos captados para Atendimento/CRM.",
        helpKey: "marketing",
        warning: "IA, Waseller e Meta/Instagram dependem de credenciais reais; o ERP não afirma automação externa sem integração configurada.",
        items: [
          { title: "Planejamento de Conteúdo", description: "Rascunhos, calendário e ideias de conteúdo.", href: "/marketing-conteudo", icon: MessageSquare, permission: "viewMarketingContent", accent: accents.cyan },
          { title: "Identidade e Conteúdo", description: "Marca, fotos, autorizações, biblioteca visual, templates e antes/depois.", href: "/identidade-visual", icon: Palette, permission: "viewVisualIdentity", accent: accents.slate },
          { title: "Entregar Contatos", description: "Registrar ou encaminhar o contato captado para Atendimento Comercial.", href: "/leads", icon: Users, permission: "viewLeads", accent: accents.violet },
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
        actions: ["Entender a necessidade recebida do Atendimento.", "Criar orçamento.", "Consultar materiais e serviços.", "Conferir cálculo, margem e condições.", "Solicitar aprovação quando necessário.", "Enviar proposta e registrar resultado.", "Entregar aprovado para Planejamento."],
        next: "Orçamento aprovado → encaminhar para Planejamento de Obras.",
        helpKey: "orcamentos",
        items: [
          { title: "Orçamentos", description: "Lista, criação, edição, PDF e envio por WhatsApp.", href: "/jobs", icon: Briefcase, permission: "viewQuotes", accent: accents.blue },
          { title: "Catálogo de Materiais", description: "Produtos/materiais com preço, comissão e desconto máximo.", href: "/catalog", icon: Package, permission: "viewQuoteRules", accent: accents.orange },
          { title: "Catálogo de Serviços", description: "Serviços, custos por m² e materiais usados na proposta.", href: "/services", icon: Layers, permission: "viewQuoteRules", accent: accents.emerald },
          { title: "Cálculo de Preço", description: "Simule preço, margem e custos antes de fechar proposta.", href: "/calculator", icon: TrendingDown, permission: "viewQuotes", accent: accents.orange },
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
        title: "Planejamento de Obras",
        description: "Planeje a execução depois que o orçamento foi aprovado: OS, agenda, equipe e preparação da obra.",
        owner: "Gestor, encarregado ou responsável pelo agendamento.",
        actions: ["Receber orçamento aprovado.", "Criar ou preparar a Ordem de Serviço.", "Agendar data e equipe.", "Conferir materiais previstos.", "Liberar a obra para Execução."],
        next: "Planejamento liberado → equipe inicia Execução da Obra.",
        helpKey: "planejamento",
        items: [
          { title: "Ordem de Serviço", description: "Criação, escopo, equipe, materiais previstos e preparação.", href: "/work-orders", icon: ClipboardList, permission: "viewWorkOrders", accent: accents.blue },
          { title: "Agenda", description: "Programação semanal e diária das equipes.", href: "/calendar", icon: Calendar, permission: "viewCalendar", accent: accents.violet },
        ],
      }}
    />
  );
}

export function ExecutionQualityHub() {
  return (
    <HubPage
      config={{
        title: "Execução de Obras",
        description: "Registre a obra em campo, evidências, consumo real, ocorrências e conclusão dentro do contexto da OS.",
        owner: "Gestor de obra, encarregado, aplicador e equipe técnica.",
        actions: ["Abrir a OS liberada.", "Registrar andamento da obra.", "Anexar fotos e evidências.", "Registrar ocorrências e consumo real.", "Conferir qualidade e bloqueios na OS.", "Finalizar quando não houver pendência."],
        next: "Obra concluída → enviar relatório e garantia para Pós-venda.",
        helpKey: "execucao",
        items: [
          { title: "Registro de Obra", description: "Registro diário, observações, fotos e consumo real.", href: "/registro-obra", icon: Clipboard, permission: "viewWorks", accent: accents.orange },
          { title: "Ordem de Serviço", description: "Execução, progresso, materiais, qualidade e finalização.", href: "/work-orders", icon: ClipboardList, permission: "viewWorkOrders", accent: accents.blue },
          { title: "Configurar Qualidade", description: "Atalho administrativo para procedimentos, checklists e padrões.", href: "/qualidade-obras", icon: ListChecks, permission: "viewSettings", accent: accents.slate },
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
        owner: "Estoquista ou responsável por materiais, ferramentas e equipamentos.",
        actions: ["Registrar retirada ou uso.", "Conferir estoque atual.", "Controlar ferramentas em campo.", "Registrar venda quando houver.", "Fazer contagem periódica.", "Resolver pendências e devoluções."],
        next: "Materiais atualizados → Financeiro e Gestão usam dados confiáveis para cobrança e auditoria.",
        helpKey: "materiais",
        items: [
          { title: "Controle de Materiais", description: "Retirada, uso, devolução, fotos e assinatura.", href: "/controle-materiais", icon: PackageCheck, permission: "registrarMaterials", accent: accents.amber },
          { title: "Estoque Atual", description: "Saldos, mínimos, status e resumo de entradas e saídas.", href: "/estoque/atual", icon: Package, permission: "viewInventoryCurrent", accent: accents.blue },
          { title: "Ferramentas", description: "Retornáveis, responsáveis, danos, perdas e manutenção.", href: "/estoque/ferramentas", icon: Wrench, permission: "viewInventoryCurrent", accent: accents.slate },
          { title: "Venda de Materiais", description: "Carrinho, descontos autorizados e aprovação administrativa.", href: "/vendas-materiais", icon: ShoppingCart, permission: "viewMaterialSales", accent: accents.blue },
          { title: "Contagem Rápida", description: "Auditoria física com processamento de lista e ajustes automáticos.", href: "/estoque/contagem-rapida", icon: ListChecks, permission: "viewInventoryCount", accent: accents.emerald },
        ],
      }}
    />
  );
}

export function FinancialHub() {
  return (
    <HubPage
      config={{
        title: "Financeiro e Administrativo",
        description: "Acompanhe dinheiro, obrigações, contratos, pagamentos, recebimentos e relatórios financeiros autorizados.",
        owner: "Administrativo / Financeiro",
        actions: ["Conferir fluxo de caixa.", "Registrar e acompanhar pagamentos.", "Emitir relatórios.", "Acompanhar contratos.", "Ajustar configurações financeiras quando autorizado."],
        next: "Financeiro conferido → Gestão acompanha indicadores e decide ajustes administrativos.",
        helpKey: "financeiro",
        items: [
          { title: "Fluxo de Caixa", description: "Entradas, saídas e visão financeira geral.", href: "/financials", icon: DollarSign, permission: "viewCashFlow", accent: accents.blue },
          { title: "Pagamentos", description: "Parcelas, status e vínculos com orçamentos.", href: "/payments", icon: CreditCard, permission: "viewPayments", accent: accents.emerald },
          { title: "Relatórios", description: "DRE, conversão, obras por período e indicadores.", href: "/relatorios", icon: BarChart3, permission: "viewFinancials", accent: accents.violet },
          { title: "Contratos", description: "Modelos e documentos administrativos.", href: "/contratos", icon: FileText, permission: "viewSettings", accent: accents.rose },
          { title: "Configurações Financeiras", description: "Formas, condições e regras de cobrança.", href: "/pagamentos-config", icon: Tag, permission: "viewFinancialSettings", accent: accents.orange },
        ],
      }}
    />
  );
}

export function TeamHub() {
  return (
    <HubPage
      config={{
        title: "Equipe e Treinamento",
        description: "Organize pessoas, acessos, permissões, produtividade e treinamento para execução correta do ERP.",
        owner: "Admin / Gestão de Pessoas",
        actions: ["Cadastrar ou conferir funcionários.", "Acompanhar produtividade.", "Orientar pela Central Como Trabalhar.", "Encaminhar dúvidas para gestor ou Admin."],
        next: "Equipe treinada → cada pessoa executa sua função no fluxo operacional.",
        helpKey: "equipe",
        items: [
          { title: "Funcionários", description: "Atalho autorizado para cadastro de usuários e cargos.", href: "/usuarios", icon: UserCog, permission: "viewUsers", accent: accents.slate },
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
        actions: ["Conferir obras concluídas.", "Emitir ou acompanhar garantias.", "Registrar contato pós-venda.", "Coletar satisfação.", "Acompanhar manutenção e histórico do cliente."],
        next: "Pós-venda concluído → histórico volta para Atendimento e Gestão em futuras oportunidades.",
        helpKey: "pos-venda",
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
        description: "Parâmetros estruturais do ERP: empresa, status, regras, pagamentos, custos e integrações futuras.",
        owner: "Administrador",
        actions: ["Controlar usuários e cargos.", "Ajustar custos, margens, regras e status.", "Configurar pagamentos e parâmetros gerais.", "Validar impacto antes de liberar uso."],
        next: "Gestão ajustada → Backups protege os dados antes de mudanças críticas.",
        helpKey: "gestao",
        items: [
          { title: "Usuários e Cargos", description: "Acessos, cargos e permissões internas.", href: "/usuarios", icon: UserCog, permission: "viewUsers", accent: accents.slate },
          { title: "Custos e Margens", description: "Margens, custos, Zona A/B/C e acréscimos regionais.", href: "/custos-margens", icon: TrendingDown, permission: "viewCostSettings", accent: accents.orange },
          { title: "Regras", description: "Critérios para score e recomendação de serviços.", href: "/priority-rules", icon: Scale, permission: "viewPriorityRules", accent: accents.violet },
          { title: "Status", description: "Etapas e status usados nos fluxos.", href: "/status-personalizados", icon: Hash, permission: "viewStatusSettings", accent: accents.blue },
          { title: "Governança Comercial", description: "Alçadas, descontos, comissões, logística e aditivos.", href: "/governanca-comercial", icon: Scale, permission: "viewSettings", accent: accents.violet },
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
        title: "Backups e Restauração",
        description: "Crie cópias seguras, exporte módulos e restaure somente após validação, preview e confirmação.",
        owner: "Administrador",
        actions: ["Gerar backup completo antes de operações críticas.", "Exportar módulos para conferência.", "Restaurar apenas com preview e confirmação.", "Conferir histórico e resultado."],
        next: "Backup concluído → operação protegida para continuar ou migrar ambiente.",
        helpKey: "backup",
        items: [
          { title: "Backup Completo", description: "Arquivo técnico restaurável com módulos suportados.", href: "/backups/backup", icon: FileText, permission: "viewBackups", accent: accents.blue },
          { title: "Exportar Módulos", description: "Baixar relatórios em PDF para conferência humana.", href: "/backups/exportacao", icon: FileText, permission: "viewExports", accent: accents.emerald },
          { title: "Restaurar", description: "Importar backups com preview antes de aplicar.", href: "/backups/restauracao", icon: Shield, permission: "viewRestore", accent: accents.orange },
        ],
      }}
    />
  );
}
