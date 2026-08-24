import { useMemo, useState } from "react";
import { Download, FileImage, ImagePlus, Palette, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const emptyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export default function VisualIdentity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [kit, setKit] = useState({ name: "Kit Visual IMPPEL", brandName: "IMPP_EL", primaryColor: "#0f766e", secondaryColor: "#1d4ed8", status: "rascunho" });
  const [standard, setStandard] = useState({ mediaType: "foto", purpose: "Evidência técnica", phase: "antes", orientation: "qualquer", minQuantity: 1, instructions: "PENDENTE DE APROVAÇÃO DA IMPPEL" });
  const [authorization, setAuthorization] = useState({ clientName: "Cliente Sintético", authorizationType: "imagem", allowedChannels: "[]", status: "aguardando", purpose: "marketing" });
  const [asset, setAsset] = useState({ name: "Foto sintética", purpose: "marketing", phase: "antes", authorizationStatus: "nao_solicitado", originalData: emptyPng });
  const [template, setTemplate] = useState({ name: "WhatsApp - envio de orçamento", templateType: "whatsapp", channel: "WhatsApp", status: "rascunho", textTemplate: "Olá, {{cliente}}. Segue o orçamento para conferência. PENDENTE DE APROVAÇÃO DA IMPPEL." });
  const [composition, setComposition] = useState({ title: "Antes e Depois Sintético", beforeAssetId: "", afterAssetId: "", format: "whatsapp", caption: "PENDENTE DE APROVAÇÃO DA IMPPEL" });
  const [preview, setPreview] = useState<any>(null);

  const { data: summary } = useQuery<any>({ queryKey: ["/api/visual-identity/summary"] });
  const { data: kits = [] } = useQuery<any[]>({ queryKey: ["/api/visual-brand-kits"] });
  const { data: standards = [] } = useQuery<any[]>({ queryKey: ["/api/visual-media-standards"] });
  const { data: authorizations = [] } = useQuery<any[]>({ queryKey: ["/api/visual-media-authorizations"] });
  const { data: assets = [] } = useQuery<any[]>({ queryKey: ["/api/visual-assets"] });
  const { data: templates = [] } = useQuery<any[]>({ queryKey: ["/api/visual-templates"] });
  const { data: compositions = [] } = useQuery<any[]>({ queryKey: ["/api/visual-compositions"] });

  const invalidate = () => {
    ["/api/visual-identity/summary", "/api/visual-brand-kits", "/api/visual-media-standards", "/api/visual-media-authorizations", "/api/visual-assets", "/api/visual-templates", "/api/visual-compositions"].forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };
  const create = (url: string, title: string) => useMutation({
    mutationFn: async (payload: any) => apiRequest("POST", url, payload),
    onSuccess: () => { invalidate(); toast({ title }); },
    onError: (error: any) => toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" }),
  });

  const createKit = create("/api/visual-brand-kits", "Kit visual registrado");
  const createStandard = create("/api/visual-media-standards", "Padrão registrado");
  const createAuthorization = create("/api/visual-media-authorizations", "Autorização registrada");
  const createAsset = create("/api/visual-assets", "Asset salvo com original preservado");
  const createTemplate = create("/api/visual-templates", "Template registrado");
  const createComposition = create("/api/visual-compositions", "Composição registrada");
  const generatePreview = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/visual-compositions/preview", composition),
    onSuccess: async (response) => setPreview(await response.json()),
    onError: (error: any) => toast({ title: "Preview bloqueado", description: error.message, variant: "destructive" }),
  });

  const approvedKit = useMemo(() => kits.find((item: any) => item.status === "aprovado"), [kits]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Identidade Visual</h1>
          <p className="text-sm text-slate-600">Kit, padrões, autorizações e materiais visuais. Conteúdo definitivo depende da aprovação da IMPPEL.</p>
        </div>
        <Badge variant={approvedKit ? "default" : "outline"}>{approvedKit ? "Kit aprovado ativo" : "Sem kit aprovado"}</Badge>
      </div>

      <section className="grid gap-3 md:grid-cols-6">
        {[
          ["Kits", summary?.totals?.brandKits || 0],
          ["Padrões", summary?.totals?.standards || 0],
          ["Autorizações", summary?.totals?.authorizations || 0],
          ["Assets", summary?.totals?.assets || 0],
          ["Templates", summary?.totals?.templates || 0],
          ["Antes/Depois", summary?.totals?.compositions || 0],
        ].map(([label, value]) => (
          <Card key={String(label)}><CardContent className="p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Kit visual</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nome" value={kit.name} onChange={(e) => setKit({ ...kit, name: e.target.value })} />
            <Input placeholder="Marca" value={kit.brandName} onChange={(e) => setKit({ ...kit, brandName: e.target.value })} />
            <Input type="color" value={kit.primaryColor} onChange={(e) => setKit({ ...kit, primaryColor: e.target.value })} />
            <Input type="color" value={kit.secondaryColor} onChange={(e) => setKit({ ...kit, secondaryColor: e.target.value })} />
            <select className="rounded-md border px-3 py-2 text-sm" value={kit.status} onChange={(e) => setKit({ ...kit, status: e.target.value })}>
              <option value="rascunho">Rascunho</option><option value="em_revisao">Em revisão</option><option value="aprovado">Aprovado</option><option value="arquivado">Arquivado</option>
            </select>
            <Button onClick={() => createKit.mutate(kit)} disabled={createKit.isPending}>Salvar kit</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileImage className="h-5 w-5" /> Padrão de foto/vídeo</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <select className="rounded-md border px-3 py-2 text-sm" value={standard.mediaType} onChange={(e) => setStandard({ ...standard, mediaType: e.target.value })}>
              <option value="foto">Foto</option><option value="video">Vídeo</option>
            </select>
            <Input placeholder="Finalidade" value={standard.purpose} onChange={(e) => setStandard({ ...standard, purpose: e.target.value })} />
            <Input placeholder="Fase" value={standard.phase} onChange={(e) => setStandard({ ...standard, phase: e.target.value })} />
            <select className="rounded-md border px-3 py-2 text-sm" value={standard.orientation} onChange={(e) => setStandard({ ...standard, orientation: e.target.value })}>
              <option value="qualquer">Qualquer</option><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option>
            </select>
            <Input type="number" min={0} value={standard.minQuantity} onChange={(e) => setStandard({ ...standard, minQuantity: Number(e.target.value) })} />
            <Textarea className="sm:col-span-2" value={standard.instructions} onChange={(e) => setStandard({ ...standard, instructions: e.target.value })} />
            <Button className="sm:col-span-2" onClick={() => createStandard.mutate(standard)} disabled={createStandard.isPending}>Salvar padrão</Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Autorização de imagem</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Cliente" value={authorization.clientName} onChange={(e) => setAuthorization({ ...authorization, clientName: e.target.value })} />
            <Input placeholder="Finalidade" value={authorization.purpose} onChange={(e) => setAuthorization({ ...authorization, purpose: e.target.value })} />
            <select className="rounded-md border px-3 py-2 text-sm" value={authorization.status} onChange={(e) => setAuthorization({ ...authorization, status: e.target.value })}>
              <option value="nao_solicitado">Não solicitado</option><option value="aguardando">Aguardando</option><option value="autorizado">Autorizado</option><option value="restricoes">Autorizado com restrições</option><option value="negado">Negado</option><option value="revogado">Revogado</option>
            </select>
            <Input placeholder="Canais JSON" value={authorization.allowedChannels} onChange={(e) => setAuthorization({ ...authorization, allowedChannels: e.target.value })} />
            <Button className="sm:col-span-2" onClick={() => createAuthorization.mutate(authorization)} disabled={createAuthorization.isPending}>Salvar autorização</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Biblioteca visual</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Nome do arquivo" value={asset.name} onChange={(e) => setAsset({ ...asset, name: e.target.value })} />
              <Input placeholder="Finalidade" value={asset.purpose} onChange={(e) => setAsset({ ...asset, purpose: e.target.value })} />
              <select className="rounded-md border px-3 py-2 text-sm" value={asset.authorizationStatus} onChange={(e) => setAsset({ ...asset, authorizationStatus: e.target.value })}>
                <option value="nao_solicitado">Não solicitado</option><option value="autorizado">Autorizado</option><option value="negado">Negado</option><option value="revogado">Revogado</option>
              </select>
              <div>
                <Label className="text-xs">Arquivo</Label>
                <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) setAsset({ ...asset, name: asset.name || file.name, originalData: await readAsDataUrl(file) });
                }} />
              </div>
            </div>
            <Button onClick={() => createAsset.mutate(asset)} disabled={createAsset.isPending}><ImagePlus className="mr-2 h-4 w-4" />Salvar asset</Button>
            <p className="text-xs text-slate-500">O original é preservado. Vídeos ficam com processamento externo pendente.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Antes / Depois</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Título" value={composition.title} onChange={(e) => setComposition({ ...composition, title: e.target.value })} />
            <select className="rounded-md border px-3 py-2 text-sm" value={composition.format} onChange={(e) => setComposition({ ...composition, format: e.target.value })}>
              <option value="whatsapp">WhatsApp</option><option value="story">Story</option><option value="feed">Feed</option><option value="orcamento">Orçamento</option>
            </select>
            <select className="rounded-md border px-3 py-2 text-sm" value={composition.beforeAssetId} onChange={(e) => setComposition({ ...composition, beforeAssetId: e.target.value })}>
              <option value="">Foto antes</option>{assets.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="rounded-md border px-3 py-2 text-sm" value={composition.afterAssetId} onChange={(e) => setComposition({ ...composition, afterAssetId: e.target.value })}>
              <option value="">Foto depois</option>{assets.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <Textarea className="sm:col-span-2" placeholder="Legenda" value={composition.caption} onChange={(e) => setComposition({ ...composition, caption: e.target.value })} />
            <Button variant="outline" onClick={() => generatePreview.mutate()} disabled={!composition.beforeAssetId || !composition.afterAssetId || generatePreview.isPending}>Gerar preview</Button>
            <Button onClick={() => createComposition.mutate({ ...composition, outputData: preview?.outputData || null })} disabled={!preview || createComposition.isPending}>Salvar composição</Button>
            {preview?.outputData && (
              <div className="sm:col-span-2 rounded-md border p-3">
                <img src={preview.outputData} alt="Preview antes e depois" className="mx-auto max-h-80 rounded border object-contain" />
                <Button className="mt-3" variant="outline" onClick={() => downloadDataUrl(preview.outputData, "antes-depois-imppel.svg")}><Download className="mr-2 h-4 w-4" />Baixar preview</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Templates</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Nome" value={template.name} onChange={(e) => setTemplate({ ...template, name: e.target.value })} />
              <Input placeholder="Tipo" value={template.templateType} onChange={(e) => setTemplate({ ...template, templateType: e.target.value })} />
              <Input placeholder="Canal" value={template.channel} onChange={(e) => setTemplate({ ...template, channel: e.target.value })} />
              <select className="rounded-md border px-3 py-2 text-sm" value={template.status} onChange={(e) => setTemplate({ ...template, status: e.target.value })}>
                <option value="rascunho">Rascunho</option><option value="em_revisao">Em revisão</option><option value="aprovado">Aprovado</option><option value="arquivado">Arquivado</option>
              </select>
            </div>
            <Textarea value={template.textTemplate} onChange={(e) => setTemplate({ ...template, textTemplate: e.target.value })} />
            <Button onClick={() => createTemplate.mutate(template)} disabled={createTemplate.isPending}>Salvar template</Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ListCard title="Padrões" items={standards} fields={["mediaType", "purpose", "phase", "status"]} />
        <ListCard title="Assets" items={assets} fields={["name", "purpose", "authorizationStatus", "processingStatus"]} />
        <ListCard title="Templates" items={templates} fields={["name", "templateType", "channel", "status"]} />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <ListCard title="Autorizações" items={authorizations} fields={["clientName", "purpose", "status"]} />
        <ListCard title="Composições" items={compositions} fields={["title", "format", "authorizationStatus", "status"]} />
      </section>
    </div>
  );
}

function ListCard({ title, items, fields }: { title: string; items: any[]; fields: string[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-500">Nenhum registro.</p>}
        {items.slice(0, 8).map((item: any) => (
          <div key={item.id} className="rounded-md border p-3 text-sm">
            <p className="font-semibold">{item.name || item.title || item.clientName || item.purpose}</p>
            <p className="mt-1 text-xs text-slate-500">{fields.map(field => item[field]).filter(Boolean).join(" • ")}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
