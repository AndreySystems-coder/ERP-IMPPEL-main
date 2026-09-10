export const CATEGORIES = [
  { value: "atendimento", label: "💬 Atendimento", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "orcamento", label: "📋 Orçamento", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  { value: "followup", label: "🔔 Follow-up", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  { value: "obra", label: "🏗️ Obra", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  { value: "manutencao", label: "🔧 Manutenção", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  { value: "geral", label: "⚙️ Geral", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(category => [category.value, category]));

export const VARIABLES_HELP = [
  { var: "{nome_cliente}", desc: "Nome do cliente" },
  { var: "{numero_orcamento}", desc: "Número do orçamento (ex: 0042)" },
  { var: "{valor_total}", desc: "Valor total em R$" },
  { var: "{tipo_servico}", desc: "Tipo de serviço realizado" },
  { var: "{data}", desc: "Data atual" },
  { var: "{data_prazo}", desc: "Prazo de execução" },
  { var: "{endereco}", desc: "Endereço da obra" },
];

export const TRIGGER_OPTIONS = [
  { value: "atendimento_inicial", label: "Atendimento Inicial (Novo Contato)" },
  { value: "menu_geral", label: "Menu Geral (após qualquer resposta)" },
  { value: "orcamento_solicitado", label: "Aguardando Orçamento" },
  { value: "aguardando_atendente", label: "Aguardando Atendente" },
  { value: "repassado_funcionario", label: "Repassado para o Funcionário" },
  { value: "orcamento_enviado", label: "Orçamento Enviado" },
  { value: "orcamento_estimando", label: "Orçamento em Análise (Estimando)" },
  { value: "orcamento_aprovado", label: "Orçamento Aprovado" },
  { value: "orcamento_nao_aprovado", label: "Orçamento Não Aprovado" },
  { value: "orcamento_agendada", label: "Execução Agendada" },
  { value: "orcamento_em_progresso", label: "Obra em Execução" },
  { value: "orcamento_concluida", label: "Orçamento Concluído" },
  { value: "orcamento_faturada", label: "Faturado" },
  { value: "followup_2d", label: "Follow-up 2 Dias" },
  { value: "followup_5d", label: "Follow-up 5 Dias" },
  { value: "obra_finalizada", label: "Obra Finalizada" },
  { value: "manutencao_12m", label: "Manutenção 12 Meses" },
  { value: "custom", label: "Personalizado" },
];

export const TRIGGER_ICON: Record<string, string> = {
  atendimento_inicial: "💬",
  menu_geral: "📎",
  orcamento_solicitado: "⏳",
  aguardando_atendente: "🙋",
  repassado_funcionario: "🤝",
  orcamento_enviado: "📋",
  orcamento_estimando: "🧮",
  orcamento_aprovado: "✅",
  orcamento_nao_aprovado: "❌",
  orcamento_agendada: "📅",
  orcamento_em_progresso: "🏗️",
  orcamento_concluida: "🏁",
  orcamento_faturada: "💰",
  followup_2d: "🔔",
  followup_5d: "🔔",
  obra_finalizada: "🎊",
  manutencao_12m: "🔧",
  custom: "⚙️",
};

export const TRIGGER_LABEL: Record<string, string> = {
  atendimento_inicial: "Atendimento Inicial",
  menu_geral: "Menu Geral",
  orcamento_solicitado: "Aguardando Orçamento",
  aguardando_atendente: "Aguardando Atendente",
  repassado_funcionario: "Repassado para o Funcionário",
  orcamento_enviado: "Orçamento Enviado",
  orcamento_estimando: "Orçamento em Análise",
  orcamento_aprovado: "Orçamento Aprovado",
  orcamento_nao_aprovado: "Orçamento Não Aprovado",
  orcamento_agendada: "Execução Agendada",
  orcamento_em_progresso: "Obra em Execução",
  orcamento_concluida: "Orçamento Concluído",
  orcamento_faturada: "Faturado",
  followup_2d: "Follow-up 2 Dias",
  followup_5d: "Follow-up 5 Dias",
  obra_finalizada: "Obra Finalizada",
  manutencao_12m: "Manutenção 12 Meses",
  custom: "Personalizado",
};

export const CRM_STATUS_COLUMNS = [
  { id: "New Lead", label: "Leads", description: "Novos contatos recebidos", dot: "bg-blue-500", color: "border-blue-200 bg-blue-50/80 dark:border-blue-900 dark:bg-blue-950/20" },
  { id: "Contacted", label: "Contatos", description: "Já houve primeiro atendimento", dot: "bg-amber-500", color: "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/20" },
  { id: "Qualified", label: "Clientes", description: "Oportunidades qualificadas", dot: "bg-emerald-500", color: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/20" },
  { id: "Proposal", label: "Conversas", description: "Orçamento ou proposta em conversa", dot: "bg-purple-500", color: "border-purple-200 bg-purple-50/80 dark:border-purple-900 dark:bg-purple-950/20" },
  { id: "Lost", label: "Próximas ações", description: "Revisar, retomar ou encerrar", dot: "bg-slate-500", color: "border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/40" },
];

export const CRM_STATUS_LABELS: Record<string, string> = Object.fromEntries(CRM_STATUS_COLUMNS.map(column => [column.id, column.label]));
