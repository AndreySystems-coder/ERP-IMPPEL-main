import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarClock, Megaphone, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function MarketingContent() {
  const { toast } = useToast();
  const [content, setContent] = useState({
    title: "Conteúdo de impermeabilização",
    campaign: "",
    channel: "Instagram",
    contentType: "post",
    status: "rascunho",
    dueDate: "",
    notes: "",
  });
  const [generatedPost, setGeneratedPost] = useState("");
  const { data: plans = [] } = useQuery<any[]>({ queryKey: ["/api/marketing-content"] });

  const createPlan = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/marketing-content", { ...content, dueDate: content.dueDate ? new Date(content.dueDate) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing-content"] });
      toast({ title: "Planejamento salvo" });
    },
    onError: (error: Error) => toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" }),
  });

  const generatePost = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/marketing-content/generate-post", { plan: content })).json(),
    onSuccess: (result) => setGeneratedPost(result.text || ""),
    onError: (error: Error) => toast({ title: "Geração indisponível", description: error.message, variant: "destructive" }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Planejamento de Conteúdo</h1>
        <p className="mt-1 text-sm text-slate-500">Calendário, campanhas, ideias e rascunhos de marketing separados da rotina comercial.</p>
      </div>

      <Card className="border-cyan-100 bg-cyan-50/60">
        <CardContent className="grid gap-3 p-4 text-sm text-cyan-950 md:grid-cols-3">
          <Info title="Primeiro" text="Defina campanha, canal e tipo de conteúdo." />
          <Info title="Depois" text="Salve o planejamento e acompanhe pendências." />
          <Info title="Atenção" text="Conteúdo gerado por IA sempre precisa de revisão antes de publicar." />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Novo planejamento</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Título" value={content.title} onChange={(event) => setContent({ ...content, title: event.target.value })} />
              <Input placeholder="Campanha" value={content.campaign} onChange={(event) => setContent({ ...content, campaign: event.target.value })} />
              <Input placeholder="Canal" value={content.channel} onChange={(event) => setContent({ ...content, channel: event.target.value })} />
              <Input placeholder="Tipo" value={content.contentType} onChange={(event) => setContent({ ...content, contentType: event.target.value })} />
              <Input type="date" value={content.dueDate} onChange={(event) => setContent({ ...content, dueDate: event.target.value })} />
              <Input placeholder="Status" value={content.status} onChange={(event) => setContent({ ...content, status: event.target.value })} />
            </div>
            <Textarea placeholder="Observações" value={content.notes} onChange={(event) => setContent({ ...content, notes: event.target.value })} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => createPlan.mutate()} disabled={createPlan.isPending}>Salvar planejamento</Button>
              <Button variant="outline" onClick={() => generatePost.mutate()} disabled={generatePost.isPending}><Sparkles className="mr-2 h-4 w-4" />Gerar rascunho</Button>
            </div>
            {generatedPost && <div className="rounded-lg border bg-white p-3 text-sm whitespace-pre-wrap">{generatedPost}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" /> Conteúdos planejados</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {plans.slice(0, 10).map((plan) => (
              <div key={plan.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{plan.title}</p>
                  <Badge variant="outline">{plan.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">{[plan.channel, plan.contentType, plan.campaign].filter(Boolean).join(" · ")}</p>
              </div>
            ))}
            {plans.length === 0 && <p className="text-sm text-slate-500">Nenhum conteúdo planejado.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Info({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg bg-white/70 p-3"><p className="font-semibold">{title}</p><p className="mt-1">{text}</p></div>;
}
