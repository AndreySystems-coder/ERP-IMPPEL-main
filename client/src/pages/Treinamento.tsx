import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GraduationCap, Plus, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { asArray } from "@/lib/safeData";

type Row = Record<string, any>;

export default function Treinamento() {
  const { toast } = useToast();
  const [program, setProgram] = useState({ name: "", targetRole: "", description: "", requiredFrequencyDays: "", active: true });
  const [record, setRecord] = useState({ userId: "", programId: "", status: "concluido", notes: "" });

  const { data: programs = [], isLoading: programsLoading } = useQuery<Row[]>({ queryKey: ["/api/training-programs"] });
  const { data: records = [], isLoading: recordsLoading } = useQuery<Row[]>({ queryKey: ["/api/training-records"] });
  const { data: users = [] } = useQuery<Row[]>({ queryKey: ["/api/users"] });

  const programsList = asArray<Row>(programs);
  const recordsList = asArray<Row>(records);
  const usersList = asArray<Row>(users);

  const createProgram = useMutation({
    mutationFn: () => apiRequest("POST", "/api/training-programs", {
      name: program.name,
      targetRole: program.targetRole || null,
      description: program.description || null,
      requiredFrequencyDays: program.requiredFrequencyDays ? Number(program.requiredFrequencyDays) : null,
      active: program.active,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-programs"] });
      setProgram({ name: "", targetRole: "", description: "", requiredFrequencyDays: "", active: true });
      toast({ title: "Programa de treinamento criado." });
    },
    onError: (e: any) => toast({ title: "Erro ao criar", description: e.message, variant: "destructive" }),
  });

  const createRecord = useMutation({
    mutationFn: () => apiRequest("POST", "/api/training-records", {
      userId: Number(record.userId),
      programId: Number(record.programId),
      status: record.status,
      completedAt: record.status === "concluido" ? new Date().toISOString() : null,
      notes: record.notes || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-records"] });
      setRecord({ userId: "", programId: "", status: "concluido", notes: "" });
      toast({ title: "Registro salvo." });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const userName = (id: number) => usersList.find(u => u.id === id)?.fullName || usersList.find(u => u.id === id)?.username || `#${id}`;
  const programName = (id: number) => programsList.find(p => p.id === id)?.name || `#${id}`;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><GraduationCap className="h-6 w-6 text-primary" />Treinamento de Equipe</h1>
        <p className="mt-1 text-sm text-slate-500">Programas de treinamento por cargo e registro de quem já concluiu cada um.</p>
      </div>

      <Tabs defaultValue="programas">
        <TabsList>
          <TabsTrigger value="programas">Programas</TabsTrigger>
          <TabsTrigger value="registros">Registros</TabsTrigger>
        </TabsList>

        <TabsContent value="programas" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Novo programa</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Nome *</Label><Input value={program.name} onChange={e => setProgram(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Integração de novo funcionário" /></div>
              <div className="space-y-1.5"><Label>Cargo-alvo</Label><Input value={program.targetRole} onChange={e => setProgram(p => ({ ...p, targetRole: e.target.value }))} placeholder="Ex: Ajudante" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Descrição</Label><Textarea value={program.description} onChange={e => setProgram(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
              <div className="space-y-1.5"><Label>Repetir a cada (dias, opcional)</Label><Input type="number" value={program.requiredFrequencyDays} onChange={e => setProgram(p => ({ ...p, requiredFrequencyDays: e.target.value }))} placeholder="Ex: 365 para anual" /></div>
              <div className="flex items-center justify-between rounded-lg border p-3"><Label>Ativo</Label><Switch checked={program.active} onCheckedChange={v => setProgram(p => ({ ...p, active: v }))} /></div>
              <Button onClick={() => createProgram.mutate()} disabled={!program.name || createProgram.isPending} className="sm:col-span-2 gap-2"><Plus className="h-4 w-4" />Criar programa</Button>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {programsLoading ? <p className="text-sm text-slate-500">Carregando...</p> : programsList.map(p => (
              <Card key={p.id}>
                <CardContent className="pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{p.name}</span>
                    <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  {p.targetRole && <p className="mt-1 text-xs text-slate-500">Cargo: {p.targetRole}</p>}
                  {p.description && <p className="mt-2 text-slate-600">{p.description}</p>}
                  {p.requiredFrequencyDays && <p className="mt-2 text-xs text-slate-400">Repete a cada {p.requiredFrequencyDays} dias</p>}
                </CardContent>
              </Card>
            ))}
            {!programsLoading && programsList.length === 0 && <p className="text-sm text-slate-500">Nenhum programa cadastrado ainda.</p>}
          </div>
        </TabsContent>

        <TabsContent value="registros" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Marcar funcionário como treinado</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Funcionário *</Label>
                <Select value={record.userId} onValueChange={v => setRecord(r => ({ ...r, userId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{usersList.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.fullName || u.username}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Programa *</Label>
                <Select value={record.programId} onValueChange={v => setRecord(r => ({ ...r, programId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{programsList.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={record.status} onValueChange={v => setRecord(r => ({ ...r, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Notas</Label><Input value={record.notes} onChange={e => setRecord(r => ({ ...r, notes: e.target.value }))} /></div>
              <Button onClick={() => createRecord.mutate()} disabled={!record.userId || !record.programId || createRecord.isPending} className="sm:col-span-2 gap-2"><UserCheck className="h-4 w-4" />Salvar registro</Button>
            </CardContent>
          </Card>

          <div className="grid gap-2">
            {recordsLoading ? <p className="text-sm text-slate-500">Carregando...</p> : recordsList.map(r => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border bg-white p-3 text-sm">
                <div>
                  <span className="font-semibold text-slate-800">{userName(r.userId)}</span>
                  <span className="text-slate-500"> — {programName(r.programId)}</span>
                  {r.notes && <p className="text-xs text-slate-400">{r.notes}</p>}
                </div>
                <Badge variant={r.status === "concluido" ? "default" : r.status === "vencido" ? "destructive" : "secondary"}>{r.status}</Badge>
              </div>
            ))}
            {!recordsLoading && recordsList.length === 0 && <p className="text-sm text-slate-500">Nenhum registro ainda.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
