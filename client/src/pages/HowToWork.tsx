import { useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { BookOpen, ExternalLink, Search, Route, Users, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const baseGuides = [
  {
    moduleKey: "marketing", title: "Marketing e Captação", summary: "Atrair oportunidades e manter a presença digital com conteúdo e mídias autorizadas.", routePath: "/marketing", audience: "Marketing / Comunicação",
    steps: [
      { title: "Planejar campanha", description: "Defina objetivo, público e canal (site, WhatsApp, indicação) antes de produzir qualquer peça." },
      { title: "Criar conteúdo", description: "Monte a peça (post, banner, mensagem) usando o kit visual e os templates já cadastrados no módulo." },
      { title: "Revisar identidade e autorização", description: "Confira se logo, cores e marca d'água seguem o kit visual e se há autorização de uso das fotos/depoimentos." },
      { title: "Publicar", description: "Publique no canal escolhido e guarde o link ou peça final para referência futura." },
      { title: "Registrar origem", description: "Marque a origem da campanha (ex: \"Instagram - promoção X\") para poder medir depois quantos leads ela gerou." },
      { title: "Entregar contato ao Atendimento", description: "Quando alguém responder, cadastre o contato como lead em Atendimento Comercial com a origem preenchida — não deixe a conversa só no WhatsApp pessoal." },
    ],
  },
  {
    moduleKey: "atendimento", title: "Atendimento Comercial", summary: "Receber, identificar, qualificar e acompanhar oportunidades.", routePath: "/crm", audience: "Comercial / Atendimento",
    steps: [
      { title: "Registrar lead", description: "Na aba \"Novos Contatos\", cadastre nome, telefone e origem assim que o contato chegar — mesmo sem todos os dados ainda." },
      { title: "Identificar cliente", description: "Confira se já existe um cadastro parecido antes de duplicar; o sistema aponta possíveis duplicidades em \"Fechados/Perdidos\"." },
      { title: "Entender necessidade", description: "Anote o que o cliente precisa, o endereço e a urgência — essa informação vai direto para quem monta o orçamento." },
      { title: "Qualificar", description: "Na aba \"Qualificação\", defina se precisa de visita técnica ou já dá para orçar direto, e avance o lead no funil." },
      { title: "Agendar próximo contato", description: "Use \"Follow-ups\" para marcar data, motivo e mensagem do próximo retorno — o sistema sugere D+2/D+5/D+10 automaticamente." },
      { title: "Encaminhar para Orçamentos", description: "Com o lead qualificado, avance pelo botão \"Próximo passo\" até o fim do fluxo e crie o orçamento em Orçamentos." },
    ],
  },
  {
    moduleKey: "orcamentos", title: "Orçamentos", summary: "Transformar oportunidade qualificada em proposta segura com preço, margem e aprovação.", routePath: "/orcamentos", audience: "Orçamentista",
    steps: [
      { title: "Entender necessidade", description: "Revise o que foi anotado no Atendimento antes de montar o orçamento, para não faltar nem sobrar item." },
      { title: "Criar orçamento", description: "Cadastre o orçamento vinculado ao cliente, com o serviço e a metragem/quantidade informados." },
      { title: "Consultar materiais e serviços", description: "Use o catálogo de produtos e serviços já cadastrados para preencher os itens em vez de digitar preços de cabeça." },
      { title: "Conferir margem", description: "Verifique a margem calculada antes de enviar; valores fora da política exigem justificativa ou aprovação." },
      { title: "Solicitar aprovação", description: "Se o desconto ou a margem estiver fora do padrão, envie para aprovação do responsável antes de mandar ao cliente." },
      { title: "Enviar proposta", description: "Gere e envie a proposta ao cliente, mudando o status para \"Proposta\" ou \"Negociação\"." },
      { title: "Encaminhar aprovado para Planejamento", description: "Ao aprovar, mude o status para \"Aprovado\" — isso libera o orçamento para virar Ordem de Serviço em Planejamento." },
    ],
  },
  {
    moduleKey: "planejamento", title: "Planejamento de Obras", summary: "Transformar orçamento aprovado em trabalho planejado.", routePath: "/planejamento-obras", audience: "Gestor de obras",
    steps: [
      { title: "Criar OS", description: "A partir do orçamento aprovado, crie a Ordem de Serviço com cliente, endereço e serviço já preenchidos." },
      { title: "Agendar", description: "Defina a data agendada — o sistema exige essa data sempre que o status da OS for \"Agendada\"." },
      { title: "Definir equipe", description: "Informe qual equipe/funcionário vai executar, para aparecer certo na Agenda e no controle de produtividade." },
      { title: "Conferir materiais previstos", description: "Revise a lista de materiais necessários calculada para a OS antes de liberar, evitando falta no dia da execução." },
      { title: "Liberar execução", description: "Com data, equipe e materiais confirmados, mude o status para \"Em Andamento\" para a equipe iniciar o registro em Execução." },
    ],
  },
  {
    moduleKey: "execucao", title: "Execução de Obras", summary: "Registrar execução, evidências, consumo, ocorrências e conclusão dentro da OS.", routePath: "/execucao-qualidade", audience: "Equipe técnica",
    steps: [
      { title: "Abrir OS", description: "Localize a Ordem de Serviço do dia em Registro de Obra e selecione-a antes de lançar qualquer informação." },
      { title: "Registrar obra", description: "Preencha os dados da execução (o que foi feito, quando) diretamente vinculados à OS selecionada." },
      { title: "Adicionar fotos", description: "Envie fotos de antes/durante/depois pela Ordem de Serviço — elas servem de prova para o cliente e para o pós-venda." },
      { title: "Informar consumo real", description: "Lance o consumo real de materiais em \"Lançar Consumo\"; o sistema compara com o previsto no orçamento." },
      { title: "Resolver ocorrências", description: "Use a aba \"Ocorrências\" dentro do Registro de Obra para relatar qualquer problema encontrado na execução." },
      { title: "Conferir qualidade", description: "Preencha o checklist e a inspeção de qualidade da própria OS antes de considerar o serviço concluído." },
      { title: "Finalizar", description: "Só mude o status da OS para \"Concluída\" depois de fotos, consumo e checklist preenchidos — isso libera o pós-venda." },
    ],
  },
  {
    moduleKey: "materiais", title: "Materiais e Equipamentos", summary: "Controlar estoque, ferramentas, retiradas, devoluções, perdas e manutenção.", routePath: "/materiais-equipamentos", audience: "Materiais / Estoque",
    steps: [
      { title: "Registrar retirada", description: "Use Controle de Materiais ou Registro Rápido para lançar o que foi retirado do estoque para uma obra." },
      { title: "Conferir estoque", description: "Acompanhe os alertas de estoque baixo em Estoque Atual antes que faltem materiais numa obra agendada." },
      { title: "Controlar ferramentas", description: "Para itens com Política de Retorno \"Retornável\", registre quem está com a ferramenta e cobre a devolução." },
      { title: "Registrar venda", description: "Vendas de materiais direto ao cliente (fora de uma OS) são lançadas em Venda de Materiais, com baixa automática no estoque." },
      { title: "Fazer contagem", description: "Use Contagem Rápida periodicamente para conferir o saldo físico contra o saldo do sistema e corrigir divergências." },
      { title: "Resolver pendências", description: "Acompanhe retiradas com devolução em aberto na aba Governança para não deixar custódia de ferramenta esquecida." },
    ],
  },
  {
    moduleKey: "financeiro", title: "Financeiro e Administrativo", summary: "Acompanhar caixa, pagamentos, recebimentos, contratos e relatórios autorizados.", routePath: "/financeiro", audience: "Financeiro",
    steps: [
      { title: "Conferir caixa", description: "Acompanhe entradas e saídas do período antes de fechar qualquer relatório financeiro." },
      { title: "Acompanhar pagamentos", description: "Revise contas a receber pendentes e marque como recebidas assim que o pagamento cair, para o Dashboard refletir a realidade." },
      { title: "Emitir relatórios", description: "Gere os relatórios financeiros do período apenas com dados já conferidos, evitando números provisórios." },
      { title: "Conferir contratos", description: "Verifique se os contratos vinculados a orçamentos aprovados estão completos antes de liberar pagamento a fornecedores/equipe." },
      { title: "Ajustar configurações financeiras", description: "Formas e condições de pagamento, taxas e categorias ficam nas configurações — ajuste aqui antes de usar em um orçamento novo." },
    ],
  },
  {
    moduleKey: "equipe", title: "Equipe e Treinamento", summary: "Gerenciar funcionários, produtividade e orientação de uso.", routePath: "/equipe", audience: "Gestão de pessoas",
    steps: [
      { title: "Conferir funcionários", description: "Em Usuários, confira cadastro, cargo e permissões de cada funcionário antes de liberar acesso a um módulo." },
      { title: "Acompanhar produtividade", description: "Use os indicadores de produtividade (registros, horas, m² executados) para identificar quem precisa de apoio ou reconhecimento." },
      { title: "Treinar pelo manual", description: "Direcione o funcionário novo para \"Como Trabalhar\" antes de soltá-lo sozinho num módulo — comece pelo fluxo recomendado no topo desta página." },
      { title: "Revisar dúvidas recorrentes", description: "Se a mesma dúvida aparecer várias vezes, verifique o glossário e os guias desta página antes de criar um treinamento à parte." },
    ],
  },
  {
    moduleKey: "pos-venda", title: "Pós-venda e Relacionamento", summary: "Acompanhar garantias, manutenção, satisfação e histórico depois da entrega.", routePath: "/pos-venda-hub", audience: "Pós-venda",
    steps: [
      { title: "Obras concluídas", description: "Acompanhe a lista de Ordens de Serviço marcadas como \"Concluída\" para saber quais entram no fluxo de pós-venda." },
      { title: "Relatório final", description: "Gere o relatório final da obra (fotos, serviço executado) para entregar ao cliente como comprovante." },
      { title: "Garantia", description: "Registre o prazo e as condições de garantia do serviço executado, vinculados à obra concluída." },
      { title: "Contato pós-venda", description: "Faça um contato programado após a entrega para confirmar satisfação e identificar problemas cedo." },
      { title: "Satisfação", description: "Registre o retorno do cliente (satisfeito, insatisfeito, com ressalva) para acompanhamento futuro." },
      { title: "Manutenção", description: "Se o cliente pedir uma manutenção dentro da garantia, registre aqui vinculado à obra original." },
      { title: "Histórico do cliente", description: "Consulte o histórico completo do cliente antes de qualquer novo atendimento — evita repetir perguntas já respondidas." },
    ],
  },
  {
    moduleKey: "gestao", title: "Gestão e Configurações", summary: "Administrar parâmetros gerais, custos, regras, status e pagamentos.", routePath: "/gestao", audience: "Admin / Gestores",
    steps: [
      { title: "Usuários e cargos", description: "Cadastre cargos com as permissões corretas antes de criar o usuário — o cargo define o que a pessoa consegue acessar." },
      { title: "Custos e margens", description: "Ajuste custos diretos, ocultos e margem mínima antes que eles afetem o cálculo de um orçamento novo." },
      { title: "Regras", description: "Configure políticas comerciais (desconto, alçada de aprovação) que serão aplicadas automaticamente nos orçamentos." },
      { title: "Status", description: "Em Status Personalizados, ajuste nomes e cores dos status de orçamento para refletir o vocabulário da equipe." },
      { title: "Configurações gerais", description: "Revise parâmetros gerais do sistema (identidade, preferências) que afetam todos os módulos." },
      { title: "Formas e condições de pagamento", description: "Cadastre as formas e condições de pagamento aceitas antes de usá-las em um orçamento ou venda." },
    ],
  },
  {
    moduleKey: "backup", title: "Backups e Restauração", summary: "Criar cópia segura e restaurar somente com preview, confirmação e banco correto.", routePath: "/backups-hub", audience: "Admin",
    steps: [
      { title: "Gerar backup em PDF por módulo", description: "No passo \"Backup\", gere um PDF de cada módulo (usuários, produtos, estoque, materiais etc.) periodicamente." },
      { title: "Restaurar PDF no módulo correto", description: "No passo \"Restauração\", escolha o card do módulo certo e use \"Restaurar PDF\" — o sistema confere o conteúdo antes de aplicar." },
      { title: "Conferir bloqueios de segurança", description: "Módulos com trava de desastre completo só aceitam restauração se já estiverem vazios no banco — leia o aviso na tela antes de tentar." },
      { title: "Conferir histórico e resultado", description: "Depois de restaurar, confira se os dados aparecem certos no módulo antes de liberar o uso normal do sistema." },
    ],
  },
];

const startFlow = [
  "Marketing",
  "Lead",
  "Atendimento",
  "Diagnóstico/Visita",
  "Orçamento",
  "Aprovação",
  "Planejamento",
  "Ordem de Serviço",
  "Execução",
  "Qualidade",
  "Encerramento",
  "Garantia",
  "Pós-venda",
  "Financeiro e indicadores",
];

const glossaryCategories = [
  {
    category: "Comercial",
    terms: [
      ["Lead", "Pessoa ou empresa interessada que ainda está em negociação."],
      ["Funil", "Caminho do contato desde o primeiro atendimento até venda fechada ou perdida."],
      ["CRM", "Área de relacionamento com clientes, leads, contatos e histórico comercial."],
      ["Follow-up", "Retorno programado para não deixar cliente sem atendimento depois de orçamento ou contato."],
      ["D+2, D+5 e D+10", "Lembretes para contato dois, cinco ou dez dias após o evento de referência."],
      ["Conversão", "Quando uma oportunidade avança para orçamento aprovado, venda ou outro objetivo definido."],
      ["Duplicidade", "Possível cadastro repetido do mesmo contato, cliente ou oportunidade."],
    ],
  },
  {
    category: "Governança comercial",
    terms: [
      ["Política comercial", "Regra administrativa para margem, desconto, comissão, pagamento ou logística."],
      ["Alçada", "Limite de decisão que define quem pode aprovar uma exceção."],
      ["Margem", "Percentual que sobra depois de custos diretos, ocultos e impostos configurados."],
      ["Markup", "Multiplicador usado para formar preço a partir de custo e margem desejada."],
    ],
  },
  {
    category: "Obra e qualidade",
    terms: [
      ["Checklist", "Lista de conferência obrigatória para confirmar execução correta."],
      ["Ocorrência", "Registro de problema ou evento observado durante a obra."],
      ["Não conformidade", "Algo fora do padrão técnico esperado, podendo bloquear conclusão."],
      ["Evidência", "Foto, vídeo ou documento que comprova etapa executada."],
    ],
  },
  {
    category: "Materiais",
    terms: [
      ["Custódia", "Responsabilidade temporária de uma ferramenta/material com funcionário."],
      ["Consumível", "Material que sai do estoque e normalmente não volta."],
      ["Retornável", "Ferramenta/equipamento que deve voltar em bom estado, danificado, perdido ou manutenção."],
    ],
  },
  {
    category: "Marketing e identidade",
    terms: [
      ["Kit visual", "Conjunto de marca, cores, padrões, marca d'água e regras de uso."],
      ["Template", "Modelo reutilizável para orçamento, WhatsApp, antes/depois, relatório ou postagem."],
    ],
  },
  {
    category: "Backup",
    terms: [
      ["Backup", "Cópia segura dos dados para conferência ou recuperação."],
      ["Restauração", "Importação validada com preview e confirmação para recuperar dados."],
    ],
  },
];

type GuideStep = { title: string; description?: string };

function normalizeSteps(rawSteps: unknown): GuideStep[] {
  let value = rawSteps;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? { title: item } : item)).filter((item) => item && item.title);
}

export default function HowToWork() {
  const [search, setSearch] = useState("");
  const queryString = useSearch();
  const { data: articles = [] } = useQuery<any[]>({ queryKey: ["/api/help-articles"] });
  const { data: procedures = [] } = useQuery<any[]>({ queryKey: ["/api/quality/procedures"] });
  const guides = [...baseGuides, ...articles.filter((article) => article.status !== "inativo")];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return guides;
    return guides.filter((guide) => [guide.title, guide.summary, guide.moduleKey, guide.audience, guide.roleName].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [guides, search]);
  const selectedKey = new URLSearchParams(queryString).get("funcao");
  const selectedGuide = baseGuides.find(guide => guide.moduleKey === selectedKey);

  if (selectedGuide) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        <Link href="/como-trabalhar" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          ← Ver todas as funções
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><BookOpen className="h-6 w-6 text-primary" />{selectedGuide.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{selectedGuide.summary}</p>
        </div>
        <Card className="border-primary/30 bg-white">
          <CardContent className="grid gap-4 pt-6 text-sm md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Quem utiliza</p>
              <p className="mt-1 font-semibold text-slate-900">{selectedGuide.audience}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">O que fazer em sequência</p>
              <ol className="mt-2 space-y-2 text-slate-700">
                {normalizeSteps(selectedGuide.steps).map((step, index) => (
                  <li key={step.title}>
                    <span className="font-semibold">{index + 1}. {step.title}</span>
                    {step.description && <p className="mt-0.5 pl-4 text-sm text-slate-500">{step.description}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
        {selectedGuide.routePath && (
          <Button asChild variant="outline" className="w-full justify-between">
            <Link href={selectedGuide.routePath}>Abrir módulo <ExternalLink className="h-4 w-4" /></Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><BookOpen className="h-6 w-6 text-primary" />Como Trabalhar</h1>
        <p className="mt-1 text-sm text-slate-500">Manual interativo do ERP para orientar atendimento, venda, obra, materiais, financeiro, qualidade e backup.</p>
      </div>
      <Card className="border-primary/20">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Route className="h-5 w-5 text-primary" />Comece aqui: fluxo recomendado</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {startFlow.map((step, index) => <Badge key={step} variant="secondary">{index + 1}. {step}</Badge>)}
          </div>
          <p className="text-sm text-slate-600">Use este caminho para entender como uma oportunidade vira obra executada, faturada, acompanhada e protegida por backup.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">Escolha sua função</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {baseGuides.map(guide => (
            <Link key={guide.moduleKey} href={`/como-trabalhar?funcao=${guide.moduleKey}`} className="rounded-lg border bg-white p-3 text-sm font-semibold text-slate-700 hover:border-primary/40 hover:text-primary">
              {guide.title}
            </Link>
          ))}
        </CardContent>
      </Card>
      <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Buscar guia, módulo ou cargo" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((guide, index) => (
          <Card key={`${guide.moduleKey}-${guide.title}-${index}`}>
            <CardHeader><CardTitle className="text-base">{guide.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Badge variant="secondary">{guide.audience || guide.roleName || guide.moduleKey}</Badge>
              <p className="text-slate-600">{guide.summary}</p>
              {normalizeSteps((guide as any).steps).length > 0 && (
                <Accordion type="single" collapsible>
                  <AccordionItem value="steps">
                    <AccordionTrigger className="py-2 text-sm">Ordem das ações</AccordionTrigger>
                    <AccordionContent>
                      <ol className="space-y-2 pl-4 text-slate-600">
                        {normalizeSteps((guide as any).steps).map((step, stepIndex) => (
                          <li key={step.title}>
                            <span className="font-semibold text-slate-700">{stepIndex + 1}. {step.title}</span>
                            {step.description && <p className="mt-0.5 text-xs text-slate-500">{step.description}</p>}
                          </li>
                        ))}
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
              {guide.routePath && <Button asChild variant="outline" className="w-full justify-between"><Link href={guide.routePath}>Abrir módulo <ExternalLink className="h-4 w-4" /></Link></Button>}
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-primary" />Para funcionário novo</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>1. Abra esta central antes de usar um módulo pela primeira vez.</p>
            <p>2. Pesquise pelo nome da tarefa: lead, retirada, orçamento, checklist ou backup.</p>
            <p>3. Leia “ordem das ações” e só depois clique em “Abrir módulo”.</p>
            <p>4. Se aparecer bloqueio, volte aqui e procure o termo no glossário.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-primary" />Para administrador</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>Antes de liberar um cargo, revise permissões, backup, fluxo operacional e regras comerciais.</p>
            <p>Cadastros com conteúdo real pendente devem permanecer em rascunho até aprovação da IMPPEL.</p>
            <p>Restauração sempre exige preview e confirmação; nunca aplique importação em banco real sem backup.</p>
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardHeader><CardTitle>Glossário rápido</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue={glossaryCategories[0].category}>
            <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
              {glossaryCategories.map(({ category }) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
            {glossaryCategories.map(({ category, terms }) => (
              <TabsContent key={category} value={category} className="mt-4">
                <Accordion type="single" collapsible className="grid gap-x-4 md:grid-cols-2">
                  {terms.map(([term, explanation]) => (
                    <AccordionItem key={term} value={term}>
                      <AccordionTrigger className="text-left text-sm hover:text-primary">{term}</AccordionTrigger>
                      <AccordionContent className="text-slate-600">{explanation}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Procedimentos de obra</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {procedures.slice(0, 8).map((procedure) => <div key={procedure.id} className="rounded-lg border p-3 text-sm"><div className="font-semibold">{procedure.name}</div><div className="text-slate-500">{procedure.category || "Sem categoria"}</div><Badge className="mt-2" variant={procedure.status === "aprovado" ? "default" : "secondary"}>{procedure.status}</Badge></div>)}
          {procedures.length === 0 && <p className="text-sm text-slate-500">Nenhum procedimento cadastrado ainda.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
