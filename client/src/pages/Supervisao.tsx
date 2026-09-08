import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckSquare, ClipboardCheck, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { asArray } from "@/lib/safeData";

type Row = Record<string, any>;

function parseItems(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function Supervisao() {
  const { toast } = useToast();
  const [template, setTemplate] = useState({ name: "", targetRole: "", frequency: "diario", itemsText: "" });
  const [runTemplateId, setRunTemplateId] = useState("");
  const [runResponses, setRunResponses] = useState<Record<string, boolean>>({});
  const [runNotes, setRunNotes] = useState("");

  const { data: templates = [], isLoading: templatesLoading } = useQuery<Row[]>({ queryKey: ["/api/supervision-checklist-templates"] });
  const { data: runs = [], isLoading: runsLoading } = useQuery<Row[]>({ queryKey: ["/api/supervision-checklist-runs"] });

  const templatesList = asArray<Row>(templates);
  const runsList = asArray<Row>(runs);
  const selectedTemplate = templatesList.find(t => String(t.id) === runTemplateId);
  const selectedItems = parseItems(selectedTemplate?.items);

  const createTemplate = useMutation({
    mutationFn: () => apiRequest("POST", "/api/supervision-checklist-templates", {
      name: template.name,
      targetRole: template.targetRole || null,
      frequency: template.frequency,
      items: JSON.stringify(template.itemsText.split(/\r?\n/).map(line => line.trim()).filter(Boolean)),
      active: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervision-checklist-templates"] });
      setTemplate({ name: "", targetRole: "", frequency: "diario", itemsText: "" });
      toast({ title: "Checklist de supervisão criado." });
    },
    onError: (e: any) => toast({ title: "Erro ao criar", description: e.message, variant: "destructive" }),
  });

  const createRun = useMutation({
    mutationFn: () => {
      const pendingCount = selectedItems.filter(item => !runResponses[item]).length;
      return apiRequest("POST", "/api/supervision-checklist-runs", {
        templateId: Number(runTemplateId),
        responses: JSON.stringify(runResponses),
        pendingCount,
        notes: runNotes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervision-checklist-runs"] });
      setRunTemplateId(""); setRunResponses({}); setRunNotes("");
      toast({ title: "Checklist de supervisão preenchido." });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const templateName = (id: number) => templatesList.find(t => t.id === id)?.name || `#${id}`;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><ClipboardCheck className="h-6 w-6 text-primary" />Supervisão</h1>
        <p className="mt-1 text-sm text-slate-500">Checklists periódicos de supervisão da equipe e das obras.</p>
      </div>

      <Tabs defaultValue="execucoes">
        <TabsList>
          <TabsTrigger value="execucoes">Preencher checklist</TabsTrigger>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
        </TabsList>

        <TabsContent value="execucoes" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Novo preenchimento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Checklist *</Label>
                <Select value={runTemplateId} onValueChange={v => { setRunTemplateId(v); setRunResponses({}); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione um modelo" /></SelectTrigger>
                  <SelectContent>{templatesList.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {selectedItems.length > 0 && (
                <div className="space-y-2 rounded-lg border p-3">
                  {selectedItems.map(item => (
                    <label key={item} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!runResponses[item]} onCheckedChange={v => setRunResponses(r => ({ ...r, [item]: Boolean(v) }))} />
                      {item}
                    </label>
                  ))}
                </div>
              )}
              <div className="space-y-1.5"><Label>Observações</Label><Textarea value={runNotes} onChange={e => setRunNotes(e.target.value)} rows={3} /></div>
              <Button onClick={() => createRun.mutate()} disabled={!runTemplateId || createRun.isPending} className="gap-2"><CheckSquare className="h-4 w-4" />Salvar checklist</Button>
            </CardContent>
          </Card>

          <div className="grid gap-2">
            {runsLoading ? <p className="text-sm text-slate-500">Carregando...</p> : runsList.map(r => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border bg-white p-3 text-sm">
                <div>
                  <span className="font-semibold text-slate-800">{templateName(r.templateId)}</span>
                  {r.supervisorUsername && <span className="text-slate-500"> — {r.supervisorUsername}</span>}
                  {r.notes && <p className="text-xs text-slate-400">{r.notes}</p>}
                </div>
                <Badge variant={r.pendingCount > 0 ? "destructive" : "default"}>{r.pendingCount > 0 ? `${r.pendingCount} pendência(s)` : "Tudo certo"}</Badge>
              </div>
            ))}
            {!runsLoading && runsList.length === 0 && <p className="text-sm text-slate-500">Nenhum checklist preenchido ainda.</p>}
          </div>
        </TabsContent>

        <TabsContent value="modelos" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Novo modelo de checklist</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Nome *</Label><Input value={template.name} onChange={e => setTemplate(t => ({ ...t, name: e.target.value }))} placeholder="Ex: Checklist diário do encarregado" /></div>
              <div className="space-y-1.5"><Label>Cargo-alvo</Label><Input value={template.targetRole} onChange={e => setTemplate(t => ({ ...t, targetRole: e.target.value }))} placeholder="Ex: Encarregado" /></div>
              <div className="space-y-1.5">
                <Label>Frequência</Label>
                <Select value={template.frequency} onValueChange={v => setTemplate(t => ({ ...t, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diario">Diário</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Itens (um por linha)</Label>
                <Textarea value={template.itemsText} onChange={e => setTemplate(t => ({ ...t, itemsText: e.target.value }))} rows={5} placeholder={"EPIs em uso\nOrganização do canteiro\nAderência ao procedimento técnico\nComunicação de intercorrências"} />
              </div>
              <Button onClick={() => createTemplate.mutate()} disabled={!template.name || createTemplate.isPending} className="sm:col-span-2 gap-2"><Plus className="h-4 w-4" />Criar modelo</Button>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {templatesLoading ? <p className="text-sm text-slate-500">Carregando...</p> : templatesList.map(t => (
              <Card key={t.id}>
                <CardContent className="pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{t.name}</span>
                    <Badge variant="secondary">{t.frequency}</Badge>
                  </div>
                  {t.targetRole && <p className="mt-1 text-xs text-slate-500">Cargo: {t.targetRole}</p>}
                  <ul className="mt-2 list-inside list-disc text-slate-600">
                    {parseItems(t.items).map(item => <li key={item}>{item}</li>)}
                  </ul>
                </CardContent>
              </Card>
            ))}
            {!templatesLoading && templatesList.length === 0 && <p className="text-sm text-slate-500">Nenhum modelo cadastrado ainda.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
