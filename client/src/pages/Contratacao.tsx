import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Briefcase, Plus, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { KanbanBoard, type KanbanColumn } from "@/components/kanban/KanbanBoard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { asArray } from "@/lib/safeData";
import { formatBrazilPhone } from "@/lib/phone";

type Row = Record<string, any>;

const STAGES: KanbanColumn[] = [
  { id: "triagem", label: "Triagem" },
  { id: "entrevista", label: "Entrevista" },
  { id: "teste_pratico", label: "Teste prático" },
  { id: "proposta", label: "Proposta" },
  { id: "contratado", label: "Contratado" },
  { id: "reprovado", label: "Reprovado" },
];

export default function Contratacao() {
  const { toast } = useToast();
  const [profile, setProfile] = useState({ roleName: "", idealProfile: "", requirements: "", interviewScript: "" });
  const [candidate, setCandidate] = useState({ name: "", roleName: "", phone: "", email: "" });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery<Row[]>({ queryKey: ["/api/hiring-profiles"] });
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery<Row[]>({ queryKey: ["/api/hiring-candidates"] });

  const profilesList = asArray<Row>(profiles);
  const candidatesList = asArray<Row>(candidates);

  const createProfile = useMutation({
    mutationFn: () => apiRequest("POST", "/api/hiring-profiles", { ...profile, active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hiring-profiles"] });
      setProfile({ roleName: "", idealProfile: "", requirements: "", interviewScript: "" });
      toast({ title: "Perfil de contratação criado." });
    },
    onError: (e: any) => toast({ title: "Erro ao criar", description: e.message, variant: "destructive" }),
  });

  const createCandidate = useMutation({
    mutationFn: () => apiRequest("POST", "/api/hiring-candidates", { ...candidate, stage: "triagem" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hiring-candidates"] });
      setCandidate({ name: "", roleName: "", phone: "", email: "" });
      toast({ title: "Candidato adicionado." });
    },
    onError: (e: any) => toast({ title: "Erro ao adicionar", description: e.message, variant: "destructive" }),
  });

  const moveCandidate = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) => apiRequest("PATCH", `/api/hiring-candidates/${id}`, { stage }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hiring-candidates"] }),
    onError: (e: any) => toast({ title: "Não foi possível mover", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Briefcase className="h-6 w-6 text-primary" />Contratação</h1>
        <p className="mt-1 text-sm text-slate-500">Perfis ideais por cargo e acompanhamento de candidatos, arrastando entre as etapas.</p>
      </div>

      <Tabs defaultValue="candidatos">
        <TabsList>
          <TabsTrigger value="candidatos">Candidatos</TabsTrigger>
          <TabsTrigger value="perfis">Perfis de vaga</TabsTrigger>
        </TabsList>

        <TabsContent value="candidatos" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Novo candidato</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Nome *</Label><Input value={candidate.name} onChange={e => setCandidate(c => ({ ...c, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Cargo</Label><Input value={candidate.roleName} onChange={e => setCandidate(c => ({ ...c, roleName: e.target.value }))} placeholder="Ex: Aplicador" /></div>
              <div className="space-y-1.5"><Label>Telefone</Label><Input value={candidate.phone} onChange={e => setCandidate(c => ({ ...c, phone: formatBrazilPhone(e.target.value) }))} placeholder="+55 (11) 99999-9999" /></div>
              <div className="space-y-1.5"><Label>E-mail</Label><Input value={candidate.email} onChange={e => setCandidate(c => ({ ...c, email: e.target.value }))} /></div>
              <Button onClick={() => createCandidate.mutate()} disabled={!candidate.name || createCandidate.isPending} className="sm:col-span-2 gap-2"><UserPlus className="h-4 w-4" />Adicionar candidato</Button>
            </CardContent>
          </Card>

          <KanbanBoard
            columns={STAGES}
            items={candidatesList}
            getItemId={c => c.id}
            getItemColumn={c => c.stage || "triagem"}
            isLoading={candidatesLoading}
            onDrop={(item, newStage) => moveCandidate.mutate({ id: item.id, stage: newStage })}
            emptyLabel="Sem candidatos"
            renderCard={c => (
              <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-sm font-bold text-slate-900">{c.name}</p>
                {c.roleName && <p className="text-xs text-slate-500">{c.roleName}</p>}
                {c.phone && <p className="mt-1 text-xs text-slate-500">{c.phone}</p>}
              </article>
            )}
          />
        </TabsContent>

        <TabsContent value="perfis" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Novo perfil de vaga</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Cargo *</Label><Input value={profile.roleName} onChange={e => setProfile(p => ({ ...p, roleName: e.target.value }))} placeholder="Ex: Ajudante" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Perfil ideal</Label><Textarea value={profile.idealProfile} onChange={e => setProfile(p => ({ ...p, idealProfile: e.target.value }))} rows={3} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Requisitos</Label><Textarea value={profile.requirements} onChange={e => setProfile(p => ({ ...p, requirements: e.target.value }))} rows={3} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Roteiro de entrevista</Label><Textarea value={profile.interviewScript} onChange={e => setProfile(p => ({ ...p, interviewScript: e.target.value }))} rows={4} /></div>
              <Button onClick={() => createProfile.mutate()} disabled={!profile.roleName || createProfile.isPending} className="sm:col-span-2 gap-2"><Plus className="h-4 w-4" />Criar perfil</Button>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {profilesLoading ? <p className="text-sm text-slate-500">Carregando...</p> : profilesList.map(p => (
              <Card key={p.id}>
                <CardContent className="pt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{p.roleName}</span>
                    <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  {p.idealProfile && <p className="text-slate-600"><span className="font-semibold">Perfil: </span>{p.idealProfile}</p>}
                  {p.requirements && <p className="text-slate-600"><span className="font-semibold">Requisitos: </span>{p.requirements}</p>}
                </CardContent>
              </Card>
            ))}
            {!profilesLoading && profilesList.length === 0 && <p className="text-sm text-slate-500">Nenhum perfil cadastrado ainda.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
