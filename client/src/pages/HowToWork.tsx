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
  { moduleKey: "marketing", title: "Marketing & Captação", summary: "Atrair oportunidades com conteúdo, identidade visual e mídias autorizadas.", routePath: "/marketing", audience: "Marketing", order: ["Definir ideia", "Escolher canal", "Separar mídia autorizada", "Gerar rascunho", "Revisar", "Publicar manualmente"] },
  { moduleKey: "atendimento", title: "Atendimento Comercial", summary: "Receber contatos, criar leads, qualificar necessidade e programar follow-up.", routePath: "/crm", audience: "Comercial", order: ["Novo contato", "Cadastrar lead", "Qualificar", "Definir próxima ação", "Encaminhar para orçamento"] },
  { moduleKey: "orcamentos", title: "Orçamentos & Negociação", summary: "Transformar oportunidade qualificada em proposta segura com preço, margem e aprovação.", routePath: "/orcamentos", audience: "Orçamentista", order: ["Diagnóstico ou visita", "Cliente", "Serviços", "Preço/margem", "Proposta", "Aprovação"] },
  { moduleKey: "planejamento", title: "Planejamento da Obra", summary: "Preparar OS, agenda, equipe e materiais antes da execução.", routePath: "/planejamento-obras", audience: "Gestor de obras", order: ["Orçamento aprovado", "Criar OS", "Agendar", "Definir equipe", "Conferir materiais", "Liberar execução"] },
  { moduleKey: "execucao", title: "Execução & Qualidade", summary: "Registrar execução, evidências, ocorrências, checklists e inspeção final.", routePath: "/execucao-qualidade", audience: "Equipe técnica", order: ["Abrir OS", "Registrar obra", "Adicionar fotos", "Informar consumo", "Resolver ocorrências", "Concluir checklist"] },
  { moduleKey: "materiais", title: "Materiais & Equipamentos", summary: "Controlar estoque, ferramentas, retiradas, devoluções, perdas e manutenção.", routePath: "/materiais-equipamentos", audience: "Materiais", order: ["Conferir saldo", "Registrar retirada", "Acompanhar em campo", "Devolver/consumir", "Tratar dano/perda", "Contar fisicamente"] },
  { moduleKey: "financeiro", title: "Financeiro & Administrativo", summary: "Acompanhar caixa, pagamentos, recebimentos, contratos e relatórios autorizados.", routePath: "/financeiro", audience: "Financeiro", order: ["Conferir vencimentos", "Registrar previsão", "Baixar pagamento", "Analisar fluxo", "Emitir relatório"] },
  { moduleKey: "equipe", title: "Equipe & Treinamento", summary: "Gerenciar pessoas, acessos, permissões, produtividade e capacitação.", routePath: "/equipe", audience: "Gestão de pessoas", order: ["Cadastrar usuário", "Definir cargo", "Revisar permissões", "Orientar pelo manual", "Acompanhar produtividade"] },
  { moduleKey: "pos-venda", title: "Pós-venda & Relacionamento", summary: "Acompanhar garantias, manutenção, satisfação e histórico depois da entrega.", routePath: "/pos-venda-hub", audience: "Pós-venda", order: ["Entrega", "Garantia", "Pesquisa", "Manutenção", "Histórico", "Indicadores"] },
  { moduleKey: "gestao", title: "Gestão & Configurações", summary: "Administrar parâmetros, status, pagamentos, custos, permissões e backups.", routePath: "/gestao", audience: "Admin", order: ["Configurar", "Validar permissão", "Testar impacto", "Gerar backup", "Liberar uso"] },
  { moduleKey: "backup", title: "Backups & Restauração", summary: "Criar cópia segura e restaurar somente com preview, confirmação e banco correto.", routePath: "/backups-hub", audience: "Admin", order: ["Backup completo", "Exportar módulo", "Enviar arquivo", "Conferir preview", "Confirmar", "Registrar relatório"] },
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
