import { useMemo, useState } from "react";
import { Link } from "wouter";
import { BookOpen, ExternalLink, Search, Route, Users, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const baseGuides = [
  { moduleKey: "crm", title: "Atendimento comercial", summary: "Registrar lead, qualificar, criar orçamento e acompanhar follow-up.", routePath: "/sistema-comercial", audience: "Comercial", order: ["Novo contato", "Cadastrar lead", "Qualificar necessidade", "Criar orçamento", "Agendar follow-up", "Fechar ou perder oportunidade"] },
  { moduleKey: "orcamentos", title: "Orçamento com margem", summary: "Criar proposta, validar margem e solicitar aprovação quando necessário.", routePath: "/jobs", audience: "Comercial", order: ["Selecionar cliente", "Adicionar serviços", "Conferir custos e margem", "Gerar proposta", "Enviar e acompanhar"] },
  { moduleKey: "obras", title: "Planejamento e ordem de serviço", summary: "Transformar venda aprovada em execução acompanhável pela equipe.", routePath: "/work-orders", audience: "Obras", order: ["Aprovar orçamento", "Criar OS", "Definir equipe/data", "Acompanhar execução", "Concluir sem pendências"] },
  { moduleKey: "qualidade", title: "Qualidade da obra", summary: "Garantir procedimento, checklist, evidência, inspeção e bloqueios críticos antes de encerrar.", routePath: "/qualidade-obras", audience: "Gestor de obras", order: ["Cadastrar procedimento", "Criar checklist", "Vincular à OS", "Registrar evidências", "Resolver bloqueios"] },
  { moduleKey: "materiais", title: "Materiais e ferramentas", summary: "Registrar retirada, transferência, consumo e devolução com foto/assinatura.", routePath: "/controle-materiais", audience: "Equipe", order: ["Conferir estoque", "Registrar retirada", "Acompanhar em campo", "Registrar consumo/devolução", "Tratar dano/perda/manutenção"] },
  { moduleKey: "estoque", title: "Estoque", summary: "Consultar saldo físico, ferramentas em campo, danos, perdas e manutenção.", routePath: "/estoque", audience: "Estoque", order: ["Cadastrar item", "Registrar entrada", "Auditar movimentações", "Contar fisicamente", "Corrigir por movimentação"] },
  { moduleKey: "financeiro", title: "Financeiro", summary: "Acompanhar pagamentos, recebimentos, fluxo de caixa e relatórios.", routePath: "/financeiro", audience: "Administrativo / Financeiro", order: ["Registrar previsão", "Conferir vencimentos", "Baixar pagamento/recebimento", "Analisar fluxo", "Gerar relatório"] },
  { moduleKey: "visual", title: "Identidade visual e marketing", summary: "Preservar originais, seguir padrões, solicitar autorização e gerar antes/depois sem publicar automaticamente.", routePath: "/identidade-visual", audience: "Equipe e Marketing", order: ["Configurar marca", "Definir padrões", "Registrar autorização", "Enviar mídia", "Gerar material aprovado"] },
  { moduleKey: "governanca", title: "Governança comercial", summary: "Controlar políticas, alçadas, descontos, comissões, custos logísticos e aditivos.", routePath: "/governanca-comercial", audience: "Admin", order: ["Cadastrar regra em rascunho", "Solicitar desconto/aditivo", "Avaliar impacto", "Aprovar ou rejeitar", "Manter histórico"] },
  { moduleKey: "backup", title: "Backup e restauração", summary: "Gerar backup completo e usar preview antes de qualquer restauração.", routePath: "/backups", audience: "Admin", order: ["Exportar backup", "Guardar arquivo fora do ERP", "Selecionar restauração", "Conferir preview", "Confirmar somente com segurança"] },
];

const startFlow = [
  "Novo contato",
  "Lead",
  "Qualificação",
  "Orçamento",
  "Follow-up",
  "Venda fechada",
  "Ordem de Serviço",
  "Materiais e execução",
  "Qualidade",
  "Financeiro",
  "Garantia e pós-venda",
  "Backup",
];

const glossary = [
  ["Lead", "Pessoa ou empresa interessada que ainda está em negociação."],
  ["Funil", "Caminho do contato desde o primeiro atendimento até venda fechada ou perdida."],
  ["CRM", "Área de relacionamento com clientes, leads, contatos e histórico comercial."],
  ["Follow-up", "Retorno programado para não deixar cliente sem atendimento depois de orçamento ou contato."],
  ["D+2, D+5 e D+10", "Lembretes para contato dois, cinco ou dez dias após o evento de referência."],
  ["Conversão", "Quando uma oportunidade avança para orçamento aprovado, venda ou outro objetivo definido."],
  ["Duplicidade", "Possível cadastro repetido do mesmo contato, cliente ou oportunidade."],
  ["Política comercial", "Regra administrativa para margem, desconto, comissão, pagamento ou logística."],
  ["Alçada", "Limite de decisão que define quem pode aprovar uma exceção."],
  ["Margem", "Percentual que sobra depois de custos diretos, ocultos e impostos configurados."],
  ["Markup", "Multiplicador usado para formar preço a partir de custo e margem desejada."],
  ["Checklist", "Lista de conferência obrigatória para confirmar execução correta."],
  ["Ocorrência", "Registro de problema ou evento observado durante a obra."],
  ["Não conformidade", "Algo fora do padrão técnico esperado, podendo bloquear conclusão."],
  ["Evidência", "Foto, vídeo ou documento que comprova etapa executada."],
  ["Custódia", "Responsabilidade temporária de uma ferramenta/material com funcionário."],
  ["Consumível", "Material que sai do estoque e normalmente não volta."],
  ["Retornável", "Ferramenta/equipamento que deve voltar em bom estado, danificado, perdido ou manutenção."],
  ["Kit visual", "Conjunto de marca, cores, padrões, marca d'água e regras de uso."],
  ["Template", "Modelo reutilizável para orçamento, WhatsApp, antes/depois, relatório ou postagem."],
  ["Backup", "Cópia segura dos dados para conferência ou recuperação."],
  ["Restauração", "Importação validada com preview e confirmação para recuperar dados."],
];

export default function HowToWork() {
  const [search, setSearch] = useState("");
  const { data: articles = [] } = useQuery<any[]>({ queryKey: ["/api/help-articles"] });
  const { data: procedures = [] } = useQuery<any[]>({ queryKey: ["/api/quality/procedures"] });
  const guides = [...baseGuides, ...articles.filter((article) => article.status !== "inativo")];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return guides;
    return guides.filter((guide) => [guide.title, guide.summary, guide.moduleKey, guide.audience, guide.roleName].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [guides, search]);

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
      <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Buscar guia, módulo ou cargo" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((guide, index) => (
          <Card key={`${guide.moduleKey}-${guide.title}-${index}`}>
            <CardHeader><CardTitle className="text-base">{guide.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Badge variant="secondary">{guide.audience || guide.roleName || guide.moduleKey}</Badge>
              <p className="text-slate-600">{guide.summary}</p>
              {Array.isArray((guide as any).order) && (
                <Accordion type="single" collapsible>
                  <AccordionItem value="steps">
                    <AccordionTrigger className="py-2 text-sm">Ordem das ações</AccordionTrigger>
                    <AccordionContent>
                      <ol className="space-y-1 pl-4 text-slate-600">
                        {(guide as any).order.map((step: string, stepIndex: number) => <li key={step}>{stepIndex + 1}. {step}</li>)}
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
          <Accordion type="single" collapsible className="grid gap-x-4 md:grid-cols-2">
            {glossary.map(([term, explanation]) => (
              <AccordionItem key={term} value={term}>
                <AccordionTrigger className="text-left text-sm">{term}</AccordionTrigger>
                <AccordionContent className="text-slate-600">{explanation}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
