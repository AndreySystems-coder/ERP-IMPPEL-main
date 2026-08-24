import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookOpenCheck, Camera, CheckCircle2, ClipboardCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Row = Record<string, any>;

const qualityEndpoints = [
  "/api/quality/procedures",
  "/api/quality/checklist-templates",
  "/api/quality/runs",
  "/api/quality/events",
  "/api/quality/indicators",
];

const phases = ["Planejamento", "Pré-obra", "Segurança", "Preparação", "Execução", "Cura e Proteção", "Inspeção", "Entrega", "Encerramento"];

function invalidateQuality() {
  qualityEndpoints.forEach(endpoint => queryClient.invalidateQueries({ queryKey: [endpoint] }));
}

function useQualityPost(endpoint: string, success: string) {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: Row) => (await apiRequest("POST", endpoint, payload)).json(),
    onSuccess: () => {
      invalidateQuality();
      toast({ title: success });
    },
    onError: (error: Error) => toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" }),
  });
}

function StatusBadge({ value }: { value?: string }) {
  const status = value || "rascunho";
  const variant = ["ativo", "aprovado", "concluido", "concluído", "resolvida", "encerrada"].includes(status) ? "default" : status.includes("bloque") ? "destructive" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function jsonListFromLines(value: string) {
  return JSON.stringify(value.split(/\r?\n/).map(line => line.trim()).filter(Boolean));
}

export default function WorkQuality() {
  const { toast } = useToast();
  const [procedure, setProcedure] = useState({
    name: "Manta asfáltica - rascunho",
    serviceName: "Manta asfáltica",
    objective: "PENDENTE DE VALIDAÇÃO TÉCNICA DA IMPPEL",
    preparation: "PENDENTE DE VALIDAÇÃO TÉCNICA DA IMPPEL",
    execution: "PENDENTE DE VALIDAÇÃO TÉCNICA DA IMPPEL",
    acceptanceCriteria: "PENDENTE DE VALIDAÇÃO TÉCNICA DA IMPPEL",
  });
  const [template, setTemplate] = useState({
    name: "Checklist base de obra",
    serviceName: "",
    procedureId: "",
    phase: "Planejamento",
    items: "Confirmar cliente | obrigatorio | true\nRegistrar foto inicial | obrigatorio | true\nOrientação ao funcionário | informativo | false",
  });
  const [run, setRun] = useState({ workOrderId: "", jobId: "", procedureId: "", checklistTemplateId: "", phase: "Planejamento", requiredItemsTotal: "1", requiredItemsDone: "0", blockingOpenCount: "1" });
  const [event, setEvent] = useState({ workOrderId: "", jobId: "", phase: "Execução", type: "ocorrencia", severity: "normal", description: "" });

  const procedures = useQuery<Row[]>({ queryKey: ["/api/quality/procedures"] });
  const templates = useQuery<Row[]>({ queryKey: ["/api/quality/checklist-templates"] });
  const runs = useQuery<Row[]>({ queryKey: ["/api/quality/runs"] });
  const events = useQuery<Row[]>({ queryKey: ["/api/quality/events"] });
  const indicators = useQuery<Row>({ queryKey: ["/api/quality/indicators"] });

  const createProcedure = useQualityPost("/api/quality/procedures", "Procedimento registrado");
  const createTemplate = useQualityPost("/api/quality/checklist-templates", "Checklist registrado");
  const createRun = useQualityPost("/api/quality/runs", "Checklist vinculado à OS");
  const createEvent = useQualityPost("/api/quality/events", "Registro de qualidade criado");

  const decideMutation = useMutation({
    mutationFn: async ({ endpoint }: { endpoint: string }) => (await apiRequest("POST", endpoint, {})).json(),
    onSuccess: () => {
      invalidateQuality();
      toast({ title: "Decisão registrada" });
    },
    onError: (error: Error) => toast({ title: "Decisão bloqueada", description: error.message, variant: "destructive" }),
  });

  const activeProcedures = useMemo(() => (procedures.data || []).filter(item => item.status === "ativo"), [procedures.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Qualidade das Obras</h1>
        <p className="text-sm text-muted-foreground">Procedimentos, checklists, evidências, ocorrências, inspeções e bloqueios de encerramento da OS.</p>
      </div>

      <Card className="border-emerald-100 bg-emerald-50/60">
        <CardContent className="grid gap-3 p-4 text-sm text-emerald-950 md:grid-cols-3">
          <InfoBlock title="Para que serve?" text="Garantir que a obra siga o padrão técnico antes de permitir encerramento seguro da OS." />
          <InfoBlock title="Ordem correta" text="Orçamento define o vendido; OS define a execução; procedimento ensina; checklist comprova; ocorrência registra problema." />
          <InfoBlock title="O que precisa de atenção?" text="Bloqueios, checklists obrigatórios incompletos, não conformidades e procedimentos ainda sem aprovação técnica." />
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ClipboardCheck className="h-4 w-4" /> Checklists</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{indicators.data?.checklistRuns || 0}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4" /> Concluídos</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{indicators.data?.completedChecklistRuns || 0}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ShieldAlert className="h-4 w-4" /> Bloqueios</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{indicators.data?.blockingOpen || 0}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4" /> Ocorrências</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{indicators.data?.openEvents || 0}</CardContent></Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="procedures">Procedimentos</TabsTrigger>
          <TabsTrigger value="checklists">Checklists</TabsTrigger>
          <TabsTrigger value="events">Ocorrências</TabsTrigger>
          <TabsTrigger value="inspections">Inspeções</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Rotina de qualidade</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-3">
              <InfoBlock title="1. Procedimento" text="Cadastre o padrão técnico da execução e aprove somente quando estiver validado." />
              <InfoBlock title="2. Checklist" text="Vincule itens obrigatórios à OS para comprovar execução, segurança e entrega." />
              <InfoBlock title="3. Evidências" text="Registre ocorrências, inspeções e bloqueios antes de encerrar a OS." />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procedures">
          <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BookOpenCheck className="h-4 w-4" /> Procedimentos Técnicos</CardTitle>
            <CardDescription>Versões aprovadas orientam obras; rascunhos com pendências não podem ser ativados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome"><Input value={procedure.name} onChange={e => setProcedure({ ...procedure, name: e.target.value })} /></Field>
              <Field label="Serviço"><Input value={procedure.serviceName} onChange={e => setProcedure({ ...procedure, serviceName: e.target.value })} /></Field>
            </div>
            <Field label="Objetivo"><Textarea value={procedure.objective} onChange={e => setProcedure({ ...procedure, objective: e.target.value })} /></Field>
            <Field label="Preparação"><Textarea value={procedure.preparation} onChange={e => setProcedure({ ...procedure, preparation: e.target.value })} /></Field>
            <Field label="Execução"><Textarea value={procedure.execution} onChange={e => setProcedure({ ...procedure, execution: e.target.value })} /></Field>
            <Field label="Critérios de aceitação"><Textarea value={procedure.acceptanceCriteria} onChange={e => setProcedure({ ...procedure, acceptanceCriteria: e.target.value })} /></Field>
            <Button onClick={() => createProcedure.mutate({ ...procedure, status: "rascunho" })} disabled={!procedure.name || createProcedure.isPending}>Registrar procedimento</Button>
            <div className="space-y-2">
              {(procedures.data || []).slice(0, 6).map(item => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><strong>{item.name}</strong><StatusBadge value={item.status} /></div>
                  <p className="text-muted-foreground">{item.serviceName || "Sem serviço"} · versão {item.version || "1.0"}</p>
                  {item.status !== "ativo" && <Button className="mt-2" size="sm" variant="outline" onClick={() => decideMutation.mutate({ endpoint: `/api/quality/procedures/${item.id}/approve` })}>Tentar aprovar</Button>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="checklists">
          <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" /> Checklists Configuráveis</CardTitle>
            <CardDescription>Itens usam formato: título | tipo | bloqueante.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Nome"><Input value={template.name} onChange={e => setTemplate({ ...template, name: e.target.value })} /></Field>
              <Field label="Procedimento ID"><Input value={template.procedureId} onChange={e => setTemplate({ ...template, procedureId: e.target.value })} /></Field>
              <Field label="Fase">
                <Select value={template.phase} onValueChange={value => setTemplate({ ...template, phase: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{phases.map(phase => <SelectItem key={phase} value={phase}>{phase}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Itens"><Textarea rows={4} value={template.items} onChange={e => setTemplate({ ...template, items: e.target.value })} /></Field>
            <Button onClick={() => createTemplate.mutate({
              ...template,
              procedureId: template.procedureId ? Number(template.procedureId) : null,
              items: JSON.stringify(template.items.split(/\r?\n/).map((line, index) => {
                const [title, type = "obrigatorio", blocking = "false"] = line.split("|").map(part => part.trim());
                return { key: `item_${index + 1}`, title, type, required: type !== "informativo", blocking: blocking === "true", order: index + 1 };
              }).filter(item => item.title)),
            })} disabled={!template.name || createTemplate.isPending}>Registrar checklist</Button>
            <div className="space-y-2">
              {(templates.data || []).slice(0, 6).map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>{item.name} · {item.phase}</span>
                  <StatusBadge value={item.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execução da OS</CardTitle>
            <CardDescription>Vincule procedimento/checklist aprovado e registre pendências bloqueantes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="OS ID"><Input value={run.workOrderId} onChange={e => setRun({ ...run, workOrderId: e.target.value })} /></Field>
              <Field label="Procedimento ID"><Input value={run.procedureId} onChange={e => setRun({ ...run, procedureId: e.target.value })} /></Field>
              <Field label="Checklist ID"><Input value={run.checklistTemplateId} onChange={e => setRun({ ...run, checklistTemplateId: e.target.value })} /></Field>
              <Field label="Obrigatórios"><Input value={run.requiredItemsTotal} onChange={e => setRun({ ...run, requiredItemsTotal: e.target.value })} /></Field>
              <Field label="Concluídos"><Input value={run.requiredItemsDone} onChange={e => setRun({ ...run, requiredItemsDone: e.target.value })} /></Field>
              <Field label="Bloqueios"><Input value={run.blockingOpenCount} onChange={e => setRun({ ...run, blockingOpenCount: e.target.value })} /></Field>
            </div>
            <Button onClick={() => createRun.mutate(run)} disabled={!run.workOrderId || createRun.isPending}>Vincular à OS</Button>
            {activeProcedures.length === 0 && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Nenhum procedimento ativo. Procedimentos com pendência técnica permanecem em rascunho.</p>}
            <div className="space-y-2">
              {(runs.data || []).slice(0, 6).map(item => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><span>OS #{item.workOrderId} · {item.phase}</span><StatusBadge value={item.status} /></div>
                  <p className="text-muted-foreground">Obrigatórios {item.requiredItemsDone}/{item.requiredItemsTotal} · bloqueios {item.blockingOpenCount}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Camera className="h-4 w-4" /> Evidências, Ocorrências e Inspeções</CardTitle>
            <CardDescription>Registre riscos, não conformidades, inspeções, entrega e evidências.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="OS ID"><Input value={event.workOrderId} onChange={e => setEvent({ ...event, workOrderId: e.target.value })} /></Field>
              <Field label="Tipo">
                <Select value={event.type} onValueChange={value => setEvent({ ...event, type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["ocorrencia", "nao_conformidade", "inspecao", "evidencia", "entrega", "treinamento"].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Gravidade">
                <Select value={event.severity} onValueChange={value => setEvent({ ...event, severity: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["baixa", "normal", "alta", "bloqueante"].map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Descrição"><Textarea value={event.description} onChange={e => setEvent({ ...event, description: e.target.value })} /></Field>
            <Button onClick={() => createEvent.mutate({ ...event, evidence: jsonListFromLines(event.description) })} disabled={!event.workOrderId || !event.description || createEvent.isPending}>Registrar</Button>
            <div className="space-y-2">
              {(events.data || []).slice(0, 6).map(item => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><span>OS #{item.workOrderId} · {item.type}</span><StatusBadge value={item.status} /></div>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="inspections">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inspeções registradas</CardTitle>
              <CardDescription>Inspeções usam o mesmo registro oficial de evidências e ficam separadas visualmente para conferência rápida.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(events.data || []).filter(item => item.type === "inspecao").slice(0, 10).map(item => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><span>OS #{item.workOrderId} · {item.phase}</span><StatusBadge value={item.status} /></div>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
              {(events.data || []).filter(item => item.type === "inspecao").length === 0 && <p className="text-sm text-muted-foreground">Nenhuma inspeção registrada.</p>}
              <Button type="button" variant="outline" onClick={() => setEvent({ ...event, type: "inspecao" })}>Preparar novo registro de inspeção</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg bg-white/70 p-3"><p className="font-semibold">{title}</p><p className="mt-1">{text}</p></div>;
}
