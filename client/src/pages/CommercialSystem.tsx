import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, CalendarClock, CheckCircle2, MessageSquare, Search, Users, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Dashboard = {
  totals: Record<string, number>;
  byStatus: Array<{ name: string; value: number }>;
  bySource: Array<{ name: string; value: number }>;
  duplicates: Array<Array<{ id: number; name: string; phone?: string; email?: string; document?: string }>>;
};
type SummaryCard = { label: string; value: number; Icon: typeof Users };

const STEP_ORDER = ["overview", "new", "qualification", "funnel", "followups", "whatsapp", "closed", "help"];
const WIZARD_PROGRESS_KEY = "imppel_commercial_wizard_step";

function loadUnlockedIndex(): number {
  try {
    const stored = Number(localStorage.getItem(WIZARD_PROGRESS_KEY) || 0);
    return Number.isFinite(stored) ? Math.min(Math.max(stored, 0), STEP_ORDER.length - 1) : 0;
  } catch {
    return 0;
  }
}

export default function CommercialSystem() {
  const { toast } = useToast();
  const [leadFilter, setLeadFilter] = useState("");
  const [followUp, setFollowUp] = useState({ leadId: "", reason: "Próximo contato", dueDate: "", messageTemplate: "" });
  const [highestUnlockedIndex, setHighestUnlockedIndex] = useState(loadUnlockedIndex);
  const [activeStep, setActiveStep] = useState(STEP_ORDER[loadUnlockedIndex()]);

  const goToStep = (step: string) => {
    const index = STEP_ORDER.indexOf(step);
    if (index <= highestUnlockedIndex) setActiveStep(step);
  };

  const advanceToNextStep = () => {
    const currentIndex = STEP_ORDER.indexOf(activeStep);
    const nextIndex = Math.min(currentIndex + 1, STEP_ORDER.length - 1);
    const unlocked = Math.max(highestUnlockedIndex, nextIndex);
    setHighestUnlockedIndex(unlocked);
    setActiveStep(STEP_ORDER[nextIndex]);
    try { localStorage.setItem(WIZARD_PROGRESS_KEY, String(unlocked)); } catch { /* localStorage indisponível */ }
  };

  const { data: dashboard } = useQuery<Dashboard>({ queryKey: ["/api/stage7/commercial-dashboard"] });
  const { data: leads = [] } = useQuery<any[]>({ queryKey: ["/api/leads"] });
  const { data: statuses = [] } = useQuery<any[]>({ queryKey: ["/api/crm-pipeline-statuses"] });
  const { data: followUps = [] } = useQuery<any[]>({ queryKey: ["/api/crm-followups"] });

  const filteredLeads = useMemo(() => {
    const term = leadFilter.trim().toLowerCase();
    if (!term) return leads.slice(0, 12);
    return leads.filter((lead) => [lead.name, lead.phone, lead.email, lead.source, lead.status].some((value) => String(value || "").toLowerCase().includes(term))).slice(0, 12);
  }, [leadFilter, leads]);

  const createFollowUp = useMutation({
    mutationFn: async () => {
      const dueDate = followUp.dueDate ? new Date(followUp.dueDate) : new Date(Date.now() + 2 * 86400000);
      return apiRequest("POST", "/api/crm-followups", { ...followUp, leadId: followUp.leadId ? Number(followUp.leadId) : undefined, dueDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stage7/commercial-dashboard"] });
      setFollowUp({ leadId: "", reason: "Follow-up D+2", dueDate: "", messageTemplate: "" });
      toast({ title: "Follow-up registrado" });
    },
  });

  const createFollowUpSequence = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/crm-followups/sequence", { leadId: Number(followUp.leadId), messageTemplate: followUp.messageTemplate }),
    onSuccess: async (response) => {
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/crm-followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stage7/commercial-dashboard"] });
      toast({ title: "Sequência criada", description: `${result.created?.length || 0} tarefas criadas, ${result.skipped?.length || 0} ignoradas.` });
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sistema Comercial</h1>
        <p className="mt-1 text-sm text-slate-500">Fluxo único para transformar contato em lead, orçamento, follow-up, venda ou oportunidade perdida.</p>
      </div>

      <Tabs value={activeStep} onValueChange={goToStep} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {[
            ["overview", "Todos"], ["new", "Novos Contatos"], ["qualification", "Qualificação"], ["funnel", "Funil"],
            ["followups", "Follow-ups"], ["whatsapp", "WhatsApp"], ["closed", "Fechados/Perdidos"], ["help", "Ajuda"],
          ].map(([value, label]) => (
            <TabsTrigger key={value} value={value} disabled={STEP_ORDER.indexOf(value) > highestUnlockedIndex}>{label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {([
              { label: "Leads", value: dashboard?.totals?.leads || 0, Icon: Users },
              { label: "Orçamentos", value: dashboard?.totals?.quotes || 0, Icon: MessageSquare },
              { label: "Follow-ups hoje", value: dashboard?.totals?.pendingFollowUps || 0, Icon: CalendarClock },
              { label: "Fechados", value: dashboard?.totals?.closedLeads || 0, Icon: CheckCircle2 },
              { label: "Perdidos", value: dashboard?.totals?.lostLeads || 0, Icon: XCircle },
            ] satisfies SummaryCard[]).map(({ label, value, Icon }) => (
              <Card key={label}><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p></div><Icon className="h-5 w-5 text-primary" /></CardContent></Card>
            ))}
          </section>

          {((dashboard?.totals?.leadsWithoutResponsible || 0) > 0 || (dashboard?.totals?.leadsWithoutNextAction || 0) > 0) && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 text-sm text-amber-900">
                Atenção: {dashboard?.totals?.leadsWithoutResponsible || 0} lead(s) ativo(s) sem responsável e {dashboard?.totals?.leadsWithoutNextAction || 0} sem próxima ação/data. Corrija em Leads antes da rotina comercial.
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">O que devo fazer agora?</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <ActionHint title="Atender novos contatos" description="Cadastre ou complete leads que chegaram por WhatsApp, indicação ou prospecção." />
              <ActionHint title="Resolver próximos contatos" description="Follow-up é o próximo contato planejado com o cliente. Priorize retornos pendentes antes de criar novas oportunidades." />
              <ActionHint title="Revisar orçamentos enviados" description="Confira propostas sem resposta e mova o lead para negociação, fechado ou perdido." />
            </CardContent>
          </Card>
          <NextStepButton onClick={advanceToNextStep} />
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <Card className="border-slate-200 bg-white"><CardContent className="p-4 text-sm text-slate-600">Novos contatos são oportunidades recém-chegadas por indicação, WhatsApp, site ou prospecção. O primeiro trabalho é identificar cliente, necessidade, urgência e responsável.</CardContent></Card>
          <LeadList title="Novos contatos" leads={filteredLeads} empty="Nenhum contato novo encontrado neste filtro." />
          <NextStepButton onClick={advanceToNextStep} />
        </TabsContent>

        <TabsContent value="qualification" className="space-y-4">
          <Card className="border-amber-100 bg-amber-50/60"><CardContent className="p-4 text-sm text-amber-900">Qualificação serve para entender problema, local, metragem aproximada, urgência e se precisa visita técnica ou orçamento preliminar.</CardContent></Card>
          <LeadList title="Leads para qualificar" leads={filteredLeads} empty="Nenhum lead pendente de qualificação neste filtro." />
          <NextStepButton onClick={advanceToNextStep} />
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card className="border-blue-100 bg-blue-50/50"><CardContent className="p-4 text-sm text-blue-900">Funil é o caminho que um possível cliente percorre desde o primeiro contato até o fechamento ou perda da oportunidade.</CardContent></Card>
          <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
            {["Novo", "Em contato", "Qualificado", "Diagnóstico/Visita", "Orçamento", "Follow-up", "Negociação", "Fechado"].map(step => <div key={step} className="rounded-lg border bg-white p-3 text-center text-xs font-semibold text-slate-700">{step}</div>)}
          </div>
          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Funil</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard?.byStatus || []}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Status configuráveis</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {statuses.map((status) => <Badge key={status.name || status.label} variant="secondary">{status.label || status.name}</Badge>)}
                {statuses.length === 0 && <p className="text-sm text-slate-500">Nenhum status personalizado cadastrado.</p>}
              </CardContent>
            </Card>
          </section>
          <NextStepButton onClick={advanceToNextStep} />
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          <Card className="border-slate-200 bg-white"><CardContent className="p-4 text-sm text-slate-600">Lead é uma pessoa ou empresa que demonstrou interesse e ainda pode se tornar cliente. Não obrigue dados que ainda não são conhecidos; complete conforme o atendimento evolui.</CardContent></Card>
          <Card>
          <CardHeader><CardTitle>Fechados, perdidos e possíveis contatos duplicados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Buscar por nome, telefone, e-mail ou origem" value={leadFilter} onChange={(event) => setLeadFilter(event.target.value)} /></div>
            <LeadList title="Registros encontrados" leads={filteredLeads} empty="Nenhum registro encontrado neste filtro." compact />
            {(dashboard?.duplicates?.length || 0) > 0 ? <p className="text-sm text-amber-700">Possíveis duplicidades são contatos que podem ter sido cadastrados mais de uma vez. Há {dashboard?.duplicates.length} grupo(s) por telefone, e-mail ou documento. Abra os registros antes de decidir mesclar.</p> : <p className="text-sm text-slate-500">Nenhuma duplicidade encontrada.</p>}
          </CardContent>
        </Card>
          <NextStepButton onClick={advanceToNextStep} />
        </TabsContent>

        <TabsContent value="followups" className="space-y-4">
          <Card className="border-emerald-100 bg-emerald-50/50"><CardContent className="p-4 text-sm text-emerald-900">Follow-up é o próximo contato planejado com o cliente. Use data, responsável, motivo e mensagem para não deixar atendimento parado.</CardContent></Card>
          <Card>
          <CardHeader><CardTitle>Novo próximo contato</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="ID do lead" value={followUp.leadId} onChange={(event) => setFollowUp({ ...followUp, leadId: event.target.value })} />
            <Input placeholder="Motivo" value={followUp.reason} onChange={(event) => setFollowUp({ ...followUp, reason: event.target.value })} />
            <Input type="datetime-local" value={followUp.dueDate} onChange={(event) => setFollowUp({ ...followUp, dueDate: event.target.value })} />
            <Textarea placeholder="Mensagem para copiar no WhatsApp" value={followUp.messageTemplate} onChange={(event) => setFollowUp({ ...followUp, messageTemplate: event.target.value })} />
            <Button className="w-full" onClick={() => createFollowUp.mutate()} disabled={createFollowUp.isPending}>Registrar</Button>
            <Button className="w-full" variant="outline" onClick={() => createFollowUpSequence.mutate()} disabled={!followUp.leadId || createFollowUpSequence.isPending}>Gerar D+2/D+5/D+10</Button>
          </CardContent>
        </Card>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {followUps.slice(0, 6).map((item) => <Card key={item.id}><CardContent className="p-4 text-sm"><div className="font-semibold">{item.reason || "Follow-up"}</div><div className="text-slate-500">{new Date(item.dueDate).toLocaleString("pt-BR")}</div><Badge className="mt-2" variant={item.status === "pendente" ? "secondary" : "outline"}>{item.status}</Badge></CardContent></Card>)}
          </section>
          <NextStepButton onClick={advanceToNextStep} />
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card><CardContent className="space-y-3 p-4 text-sm text-slate-600"><p>WhatsApp reúne roteiros de atendimento, diagnóstico, envio de orçamento, follow-up, confirmação de obra, pós-venda, manutenção e garantia.</p><p>Enquanto não houver API/credenciais reais da Waseller, o ERP prepara mensagens para cópia e envio manual. Isso não é automação externa.</p></CardContent></Card>
          <NextStepButton onClick={advanceToNextStep} />
        </TabsContent>

        <TabsContent value="help">
          <Card><CardContent className="space-y-2 p-4 text-sm text-slate-600"><p><strong>Lead:</strong> contato com potencial de virar cliente.</p><p><strong>Qualificação:</strong> etapa para entender necessidade, local, urgência e próximo passo.</p><p><strong>Follow-up:</strong> próximo contato planejado para continuar a negociação.</p><p><strong>Duplicidade:</strong> alerta para cadastros parecidos; nunca mescle sem conferir.</p><p><strong>Marketing:</strong> fica em Marketing & Captação; aqui aparecem apenas impactos comerciais.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NextStepButton({ onClick, label = "Próximo passo" }: { onClick: () => void; label?: string }) {
  return (
    <div className="flex justify-end">
      <Button onClick={onClick} className="gap-2">{label} <ArrowRight className="h-4 w-4" /></Button>
    </div>
  );
}

function ActionHint({ title, description }: { title: string; description: string }) {
  return <div className="rounded-lg border bg-white p-3 text-sm"><p className="font-semibold text-slate-900">{title}</p><p className="mt-1 text-slate-600">{description}</p></div>;
}

function LeadList({ title, leads, empty, compact = false }: { title: string; leads: any[]; empty: string; compact?: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className={`grid gap-2 ${compact ? "sm:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
          {leads.map((lead) => <div key={lead.id} className="rounded-lg border p-3 text-sm"><div className="font-semibold">{lead.name}</div><div className="text-slate-500">{lead.phone || lead.email || "Sem contato"}</div><Badge className="mt-2" variant="outline">{lead.status}</Badge></div>)}
        </div>
        {leads.length === 0 && <p className="text-sm text-slate-500">{empty}</p>}
      </CardContent>
    </Card>
  );
}
