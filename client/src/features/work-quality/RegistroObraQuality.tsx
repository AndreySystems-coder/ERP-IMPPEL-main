import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpenCheck, Camera, ClipboardCheck, SearchCheck } from "lucide-react";
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

/** Procedimentos técnicos — não são vinculados a uma OS específica (padrão de execução do serviço). */
function ProceduresPanel() {
  const [procedure, setProcedure] = useState({
    name: "Manta asfáltica - rascunho",
    serviceName: "Manta asfáltica",
    objective: "PENDENTE DE VALIDAÇÃO TÉCNICA DA IMPPEL",
    preparation: "PENDENTE DE VALIDAÇÃO TÉCNICA DA IMPPEL",
    execution: "PENDENTE DE VALIDAÇÃO TÉCNICA DA IMPPEL",
    acceptanceCriteria: "PENDENTE DE VALIDAÇÃO TÉCNICA DA IMPPEL",
  });
  const procedures = useQuery<Row[]>({ queryKey: ["/api/quality/procedures"] });
  const createProcedure = useQualityPost("/api/quality/procedures", "Procedimento registrado");
  const decideMutation = useMutation({
    mutationFn: async ({ endpoint }: { endpoint: string }) => (await apiRequest("POST", endpoint, {})).json(),
    onSuccess: invalidateQuality,
  });

  return (
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
  );
}

/** Checklist de execução vinculado a esta OS especificamente. */
function ChecklistPanel({ workOrderId }: { workOrderId: number }) {
  const [run, setRun] = useState({ procedureId: "", checklistTemplateId: "", phase: "Planejamento", requiredItemsTotal: "1", requiredItemsDone: "0", blockingOpenCount: "1" });
  const runs = useQuery<Row[]>({ queryKey: ["/api/quality/runs"] });
  const createRun = useQualityPost("/api/quality/runs", "Checklist vinculado à OS");
  const runsForThisWO = (runs.data || []).filter(item => Number(item.workOrderId) === workOrderId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" /> Checklist desta OS</CardTitle>
        <CardDescription>Vincule procedimento/checklist aprovado e registre pendências bloqueantes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Procedimento ID"><Input value={run.procedureId} onChange={e => setRun({ ...run, procedureId: e.target.value })} /></Field>
          <Field label="Checklist ID"><Input value={run.checklistTemplateId} onChange={e => setRun({ ...run, checklistTemplateId: e.target.value })} /></Field>
          <Field label="Fase">
            <Select value={run.phase} onValueChange={value => setRun({ ...run, phase: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{phases.map(phase => <SelectItem key={phase} value={phase}>{phase}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Obrigatórios"><Input value={run.requiredItemsTotal} onChange={e => setRun({ ...run, requiredItemsTotal: e.target.value })} /></Field>
          <Field label="Concluídos"><Input value={run.requiredItemsDone} onChange={e => setRun({ ...run, requiredItemsDone: e.target.value })} /></Field>
          <Field label="Bloqueios"><Input value={run.blockingOpenCount} onChange={e => setRun({ ...run, blockingOpenCount: e.target.value })} /></Field>
        </div>
        <Button onClick={() => createRun.mutate({ ...run, workOrderId: String(workOrderId) })} disabled={createRun.isPending}>Vincular checklist a esta OS</Button>
        <div className="space-y-2">
          {runsForThisWO.length === 0 && <p className="text-sm text-muted-foreground">Nenhum checklist vinculado a esta OS ainda.</p>}
          {runsForThisWO.slice(0, 6).map(item => (
            <div key={item.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2"><span>{item.phase}</span><StatusBadge value={item.status} /></div>
              <p className="text-muted-foreground">Obrigatórios {item.requiredItemsDone}/{item.requiredItemsTotal} · bloqueios {item.blockingOpenCount}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Ocorrências e inspeções desta OS — mesmo mecanismo de registro, tipo diferente. */
function EventPanel({ workOrderId, fixedType, title, description }: { workOrderId: number; fixedType?: string; title: string; description: string }) {
  const [event, setEvent] = useState({ type: fixedType || "ocorrencia", severity: "normal", description: "" });
  const events = useQuery<Row[]>({ queryKey: ["/api/quality/events"] });
  const createEvent = useQualityPost("/api/quality/events", "Registro de qualidade criado");

  const relevantTypes = fixedType === "inspecao" ? ["inspecao"] : ["ocorrencia", "nao_conformidade", "evidencia", "entrega", "treinamento"];
  const eventsForThisWO = (events.data || []).filter(item => Number(item.workOrderId) === workOrderId && relevantTypes.includes(item.type));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Camera className="h-4 w-4" /> {title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {!fixedType && (
            <Field label="Tipo">
              <Select value={event.type} onValueChange={value => setEvent({ ...event, type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {relevantTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Gravidade">
            <Select value={event.severity} onValueChange={value => setEvent({ ...event, severity: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["baixa", "normal", "alta", "bloqueante"].map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Descrição"><Textarea value={event.description} onChange={e => setEvent({ ...event, description: e.target.value })} /></Field>
        <Button onClick={() => createEvent.mutate({ ...event, workOrderId: String(workOrderId), evidence: jsonListFromLines(event.description) })} disabled={!event.description || createEvent.isPending}>Registrar</Button>
        <div className="space-y-2">
          {eventsForThisWO.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro ainda para esta OS.</p>}
          {eventsForThisWO.slice(0, 6).map(item => (
            <div key={item.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2"><span>{item.type}</span><StatusBadge value={item.status} /></div>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RegistroObraQuality({ workOrderId }: { workOrderId: number }) {
  return (
    <div className="border-2 border-emerald-200 rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <SearchCheck className="w-5 h-5 text-emerald-700" />
        <h2 className="font-bold text-slate-800 text-base">Qualidade desta Obra</h2>
      </div>
      <Tabs defaultValue="procedimentos" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="procedimentos">Procedimentos</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
          <TabsTrigger value="inspecao">Inspeção</TabsTrigger>
        </TabsList>
        <TabsContent value="procedimentos"><ProceduresPanel /></TabsContent>
        <TabsContent value="checklist"><ChecklistPanel workOrderId={workOrderId} /></TabsContent>
        <TabsContent value="ocorrencias">
          <EventPanel workOrderId={workOrderId} title="Ocorrências e Não Conformidades" description="Registre riscos, não conformidades, evidências e entrega desta obra." />
        </TabsContent>
        <TabsContent value="inspecao">
          <EventPanel workOrderId={workOrderId} fixedType="inspecao" title="Inspeções" description="Registre e consulte as inspeções realizadas nesta obra." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
