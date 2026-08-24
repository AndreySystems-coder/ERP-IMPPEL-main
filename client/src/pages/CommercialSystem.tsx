import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, Megaphone, MessageSquare, Search, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export default function CommercialSystem() {
  const { toast } = useToast();
  const [leadFilter, setLeadFilter] = useState("");
  const [followUp, setFollowUp] = useState({ leadId: "", reason: "Follow-up D+2", dueDate: "", messageTemplate: "" });
  const [content, setContent] = useState({ title: "", channel: "Instagram", objective: "", idea: "", category: "prova", serviceName: "", cta: "" });
  const [generatedPost, setGeneratedPost] = useState<any>(null);

  const { data: dashboard } = useQuery<Dashboard>({ queryKey: ["/api/stage7/commercial-dashboard"] });
  const { data: leads = [] } = useQuery<any[]>({ queryKey: ["/api/leads"] });
  const { data: statuses = [] } = useQuery<any[]>({ queryKey: ["/api/crm-pipeline-statuses"] });
  const { data: followUps = [] } = useQuery<any[]>({ queryKey: ["/api/crm-followups"] });
  const { data: plans = [] } = useQuery<any[]>({ queryKey: ["/api/marketing-content"] });

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

  const createPlan = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/marketing-content", content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing-content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stage7/commercial-dashboard"] });
      setContent({ title: "", channel: "Instagram", objective: "", idea: "", category: "prova", serviceName: "", cta: "" });
      toast({ title: "Ideia de conteúdo registrada" });
    },
  });

  const generatePost = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/marketing-content/generate-post", content),
    onSuccess: async (response) => setGeneratedPost(await response.json()),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sistema Comercial</h1>
        <p className="mt-1 text-sm text-slate-500">Fluxo único de lead, orçamento, follow-up, fechamento e conteúdo.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {([
          { label: "Leads", value: dashboard?.totals?.leads || 0, Icon: Users },
          { label: "Orçamentos", value: dashboard?.totals?.quotes || 0, Icon: MessageSquare },
          { label: "Follow-ups", value: dashboard?.totals?.pendingFollowUps || 0, Icon: CalendarClock },
          { label: "Vencidos", value: dashboard?.totals?.overdueFollowUps || 0, Icon: CalendarClock },
          { label: "Conteúdos", value: dashboard?.totals?.contentPlans || plans.length, Icon: Megaphone },
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
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Leads e duplicidades</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Buscar por nome, telefone, e-mail ou origem" value={leadFilter} onChange={(event) => setLeadFilter(event.target.value)} /></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredLeads.map((lead) => <div key={lead.id} className="rounded-lg border p-3 text-sm"><div className="font-semibold">{lead.name}</div><div className="text-slate-500">{lead.phone || lead.email || "Sem contato"}</div><Badge className="mt-2" variant="outline">{lead.status}</Badge></div>)}
            </div>
            {(dashboard?.duplicates?.length || 0) > 0 && <p className="text-sm text-amber-700">Há {dashboard?.duplicates.length} possível(is) duplicidade(s) por telefone, e-mail ou documento.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Novo follow-up</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="ID do lead" value={followUp.leadId} onChange={(event) => setFollowUp({ ...followUp, leadId: event.target.value })} />
            <Input placeholder="Motivo" value={followUp.reason} onChange={(event) => setFollowUp({ ...followUp, reason: event.target.value })} />
            <Input type="datetime-local" value={followUp.dueDate} onChange={(event) => setFollowUp({ ...followUp, dueDate: event.target.value })} />
            <Textarea placeholder="Mensagem para copiar no WhatsApp" value={followUp.messageTemplate} onChange={(event) => setFollowUp({ ...followUp, messageTemplate: event.target.value })} />
            <Button className="w-full" onClick={() => createFollowUp.mutate()} disabled={createFollowUp.isPending}>Registrar</Button>
            <Button className="w-full" variant="outline" onClick={() => createFollowUpSequence.mutate()} disabled={!followUp.leadId || createFollowUpSequence.isPending}>Gerar D+2/D+5/D+10</Button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader><CardTitle>Planejamento de marketing</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Título" value={content.title} onChange={(event) => setContent({ ...content, title: event.target.value })} />
          <Input placeholder="Canal" value={content.channel} onChange={(event) => setContent({ ...content, channel: event.target.value })} />
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={content.category} onChange={(event) => setContent({ ...content, category: event.target.value })}>
            <option value="prova">Prova</option>
            <option value="autoridade">Autoridade</option>
            <option value="conversao">Conversão</option>
          </select>
          <Input placeholder="Serviço" value={content.serviceName} onChange={(event) => setContent({ ...content, serviceName: event.target.value })} />
          <Input placeholder="Objetivo" value={content.objective} onChange={(event) => setContent({ ...content, objective: event.target.value })} />
          <Input placeholder="CTA" value={content.cta} onChange={(event) => setContent({ ...content, cta: event.target.value })} />
          <Button onClick={() => generatePost.mutate()} disabled={generatePost.isPending}>Gerar rascunho</Button>
          <Button onClick={() => createPlan.mutate()} disabled={!content.title.trim() || createPlan.isPending}>Salvar ideia</Button>
          <Textarea className="md:col-span-4" placeholder="Ideia, roteiro ou gancho do conteúdo" value={content.idea} onChange={(event) => setContent({ ...content, idea: event.target.value })} />
          {generatedPost && (
            <div className="md:col-span-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold">Rascunho gerado para revisão humana</p>
              <p className="mt-2">{generatedPost.caption}</p>
              <p className="mt-2 text-slate-600">{generatedPost.shortScript}</p>
              <p className="mt-2 text-amber-700">{generatedPost.warning}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {followUps.slice(0, 6).map((item) => <Card key={item.id}><CardContent className="p-4 text-sm"><div className="font-semibold">{item.reason || "Follow-up"}</div><div className="text-slate-500">{new Date(item.dueDate).toLocaleString("pt-BR")}</div><Badge className="mt-2" variant={item.status === "pendente" ? "secondary" : "outline"}>{item.status}</Badge></CardContent></Card>)}
      </section>
    </div>
  );
}
