import { useMemo, useState } from "react";
import { Link } from "wouter";
import { BookOpen, ExternalLink, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const baseGuides = [
  { moduleKey: "crm", title: "Atendimento comercial", summary: "Registrar lead, qualificar, criar orçamento e acompanhar follow-up.", routePath: "/sistema-comercial", audience: "Comercial" },
  { moduleKey: "orcamentos", title: "Orçamento com margem", summary: "Criar proposta, validar margem e solicitar aprovação quando necessário.", routePath: "/jobs", audience: "Comercial" },
  { moduleKey: "obras", title: "Execução da OS", summary: "Acompanhar OS, checklist, procedimento aprovado e registro de obra.", routePath: "/work-orders", audience: "Obras" },
  { moduleKey: "materiais", title: "Controle de materiais", summary: "Registrar retirada, transferência, consumo e devolução com foto/assinatura.", routePath: "/controle-materiais", audience: "Equipe" },
  { moduleKey: "estoque", title: "Estoque e ferramentas", summary: "Consultar saldo físico, ferramentas em campo, danos, perdas e manutenção.", routePath: "/estoque", audience: "Estoque" },
  { moduleKey: "backup", title: "Backup e restauração", summary: "Gerar backup completo e usar preview antes de qualquer restauração.", routePath: "/backups", audience: "Admin" },
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
        <p className="mt-1 text-sm text-slate-500">Guias rápidos por módulo, procedimento e cargo. Conteúdo técnico pendente deve ser aprovado pela IMPPEL antes de uso em obra.</p>
      </div>
      <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Buscar guia, módulo ou cargo" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((guide, index) => (
          <Card key={`${guide.moduleKey}-${guide.title}-${index}`}>
            <CardHeader><CardTitle className="text-base">{guide.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Badge variant="secondary">{guide.audience || guide.roleName || guide.moduleKey}</Badge>
              <p className="text-slate-600">{guide.summary}</p>
              {guide.routePath && <Button asChild variant="outline" className="w-full justify-between"><Link href={guide.routePath}>Abrir módulo <ExternalLink className="h-4 w-4" /></Link></Button>}
            </CardContent>
          </Card>
        ))}
      </section>
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
