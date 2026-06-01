import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Plus, Trash2, Star, Loader2,
  LayoutTemplate, Columns, Eye, Save, RotateCcw,
  CheckCircle2, Settings2, Palette, Maximize2, ToggleLeft,
  PlayCircle, ExternalLink,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gerarOrcamentoPDFPreview, DEFAULT_PDF_CONFIG, mergeQuoteTemplateConfig } from "@/lib/orcamentoPDF";
import type { QuoteTemplateConfig, MaterialDisplayMode } from "@/lib/orcamentoPDF";
// Re-export QuoteTemplateConfig for consumers that import from this page
export type { QuoteTemplateConfig } from "@/lib/orcamentoPDF";

interface QuoteTemplate {
  id: number;
  name: string;
  isDefault: boolean;
  config: string;
  createdAt: string | null;
  updatedAt: string | null;
}

// Alias for local use — single source of truth is DEFAULT_PDF_CONFIG in orcamentoPDF.ts
const DEFAULT_TEMPLATE_CONFIG: QuoteTemplateConfig = DEFAULT_PDF_CONFIG;

function parseConfig(raw: string): QuoteTemplateConfig {
  try {
    return mergeQuoteTemplateConfig(JSON.parse(raw));
  } catch { return DEFAULT_TEMPLATE_CONFIG; }
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

function PDFPreview({ config }: { config: QuoteTemplateConfig }) {
  const { headerColor, totalsColor, margins, columns, fontSize, rowPadding, sections } = config;
  const totalW = columns.item + columns.desc + columns.unid + columns.qtde + columns.unit + columns.total;
  const contentW = 210 - margins.left * 2;
  const scaleX = contentW / totalW;

  const rows = [
    { idx: 1, desc: "IMPERMEABILIZAÇÃO DE LAJE — Produto Manta Asfáltica 4mm", area: "120,00", unit: "R$ 42,00", total: "R$ 5.040,00", alt: false },
    { idx: 2, desc: "IMPERMEABILIZAÇÃO DE BANHEIRO — Produto Vedacit Weber", area: "18,50", unit: "R$ 65,00", total: "R$ 1.202,50", alt: true },
    { idx: 3, desc: "CALAFETAÇÃO DE RACHADURAS — Polyurex Bicomponente", area: "8,00", unit: "R$ 38,00", total: "R$ 304,00", alt: false },
  ];

  const headerRgb = headerColor;
  const totalsRgb = totalsColor;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden select-none" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Page header bar */}
      <div className="w-full flex items-stretch" style={{ backgroundColor: headerRgb, minHeight: 56 }}>
        <div className="flex flex-col justify-center px-4 py-3 flex-1">
          <div className="font-bold text-white" style={{ fontSize: fontSize.header * 2.6 }}>
            IMPP<span style={{ color: totalsRgb }}>EL</span>
          </div>
          <div className="text-blue-200 text-xs mt-0.5" style={{ fontSize: fontSize.body * 1.6 }}>Impermeabilização Profissional</div>
        </div>
        <div className="flex flex-col justify-center text-right px-4 py-3">
          <div className="text-blue-200" style={{ fontSize: fontSize.body * 1.5 }}>TEL.: (015) 3302-2397</div>
          <div className="text-blue-200" style={{ fontSize: fontSize.body * 1.5 }}>vendas@imppel.com.br</div>
        </div>
      </div>

      {/* Número / Data bar */}
      <div className="flex justify-between items-center px-4 py-1.5 border-b" style={{ backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" }}>
        <span className="font-bold text-blue-900" style={{ fontSize: config.fontSize.header * 1.8 }}>Orçamento Nº: 0042</span>
        <span className="font-semibold text-blue-900" style={{ fontSize: config.fontSize.date * 1.7 }}>16/04/2026</span>
      </div>

      <div className="px-3 py-2 space-y-2">
        {/* Clientes block */}
        {sections.showClientes && (
          <div className="rounded overflow-hidden border" style={{ borderColor: "#E2E8F0" }}>
            <div className="px-2 py-1 font-bold text-white text-xs" style={{ backgroundColor: headerRgb, fontSize: fontSize.header * 1.6 }}>
              NOME / PARTE ENVOLVIDA &nbsp;&nbsp; CARGO / PAPEL &nbsp;&nbsp; TELEFONE &nbsp;&nbsp; ENDEREÇO / CIDADE
            </div>
            <div className="flex text-gray-700" style={{ paddingTop: config.sectionPadding.top / 2, paddingBottom: config.sectionPadding.bottom / 2, fontSize: fontSize.body * 1.6 }}>
              <span className="px-2 truncate" style={{ flex: config.clientColumns.nome }}>João da Silva</span>
              <span className="px-1 truncate" style={{ flex: config.clientColumns.cargo }}>Proprietário</span>
              <span className="px-1 truncate" style={{ flex: config.clientColumns.telefone }}>(15) 99000-1111</span>
              <span className="px-1 flex-1 truncate text-gray-500">Rua das Flores, 100 - Centro - Sorocaba/SP - 18020-100</span>
            </div>
          </div>
        )}

        {/* Responsaveis block */}
        {sections.showResponsaveis && (
          <div className="rounded overflow-hidden border" style={{ borderColor: "#E2E8F0" }}>
            <div className="px-2 py-1 font-bold text-white text-xs" style={{ backgroundColor: headerRgb, fontSize: fontSize.header * 1.6 }}>
              RESPONSÁVEL / EQUIPE TÉCNICA &nbsp;&nbsp; CARGO / FUNÇÃO &nbsp;&nbsp; TELEFONE
            </div>
            <div className="px-2 flex gap-3 text-gray-700" style={{ paddingTop: config.sectionPadding.top / 2, paddingBottom: config.sectionPadding.bottom / 2, fontSize: fontSize.body * 1.6 }}>
              <span className="flex-1">Carlos Pereira</span>
              <span className="w-24">Encarregado</span>
              <span className="w-24">(15) 99111-2222</span>
            </div>
          </div>
        )}

        {/* Services table */}
        <div className="rounded overflow-hidden border" style={{ borderColor: "#E2E8F0" }}>
          {/* Table header */}
          <div className="flex" style={{ backgroundColor: headerRgb }}>
            {[
              { label: "ITEM", w: columns.item, align: "center" },
              { label: "DESCRIÇÃO DE SERVIÇOS", w: columns.desc, align: "left" },
              { label: "UNID.", w: columns.unid, align: "center" },
              { label: "QUANTIDADE", w: columns.qtde, align: "center" },
              { label: "UNITÁRIO", w: columns.unit, align: "right" },
              { label: "TOTAL", w: columns.total, align: "right" },
            ].map((col, i) => (
              <div
                key={i}
                className="text-white font-bold overflow-hidden"
                style={{
                  flex: col.w * scaleX,
                  textAlign: col.align as any,
                  fontSize: fontSize.header * 1.55,
                  paddingTop: rowPadding.top / 3,
                  paddingBottom: rowPadding.bottom / 3,
                  paddingLeft: 4,
                  paddingRight: 4,
                  minWidth: 0,
                }}
              >
                <span className="truncate block">{col.label}</span>
              </div>
            ))}
          </div>
          {/* Rows */}
          {rows.map(row => (
            <div key={row.idx} className="flex border-t" style={{ backgroundColor: row.alt ? "#F8FAFC" : "#FFFFFF", borderColor: "#E2E8F0" }}>
              <div style={{ flex: columns.item * scaleX, textAlign: "center", fontSize: fontSize.body * 1.55, paddingTop: rowPadding.top / 3, paddingBottom: rowPadding.bottom / 3, paddingLeft: 4, paddingRight: 4, minWidth: 0 }} className="font-bold text-gray-700 overflow-hidden">{row.idx}</div>
              <div style={{ flex: columns.desc * scaleX, textAlign: "left", fontSize: fontSize.body * 1.55, paddingTop: rowPadding.top / 3, paddingBottom: rowPadding.bottom / 3, paddingLeft: 4, paddingRight: 4, minWidth: 0 }} className="text-gray-700 overflow-hidden">
                <span className="block truncate leading-tight">{row.desc}</span>
              </div>
              <div style={{ flex: columns.unid * scaleX, textAlign: "center", fontSize: fontSize.body * 1.55, paddingTop: rowPadding.top / 3, paddingBottom: rowPadding.bottom / 3, minWidth: 0 }} className="text-gray-700">M²</div>
              <div style={{ flex: columns.qtde * scaleX, textAlign: "center", fontSize: fontSize.body * 1.55, paddingTop: rowPadding.top / 3, paddingBottom: rowPadding.bottom / 3, minWidth: 0 }} className="text-gray-700">{row.area}</div>
              <div style={{ flex: columns.unit * scaleX, textAlign: "right", fontSize: fontSize.body * 1.55, paddingTop: rowPadding.top / 3, paddingBottom: rowPadding.bottom / 3, paddingRight: 4, minWidth: 0 }} className="text-gray-700">{row.unit}</div>
              <div style={{ flex: columns.total * scaleX, textAlign: "right", fontSize: fontSize.body * 1.55, paddingTop: rowPadding.top / 3, paddingBottom: rowPadding.bottom / 3, paddingRight: 4, minWidth: 0 }} className="font-bold text-gray-900">{row.total}</div>
            </div>
          ))}
          {/* Total bar */}
          <div className="flex border-t" style={{ borderColor: "#E2E8F0" }}>
            <div style={{ flex: (columns.item + columns.desc + columns.unid + columns.qtde + columns.unit) * scaleX, backgroundColor: headerRgb, textAlign: "right", fontSize: fontSize.totals * 1.7, padding: "6px 8px 6px 4px" }} className="font-bold text-white">
              TOTAL GERAL
            </div>
            <div style={{ flex: columns.total * scaleX, backgroundColor: totalsRgb, textAlign: "right", fontSize: fontSize.totals * 1.7, padding: "6px 6px 6px 0" }} className="font-bold text-white">
              R$ 6.546,50
            </div>
          </div>
        </div>

        {/* Payment conditions */}
        {sections.showPaymentConditions && (
          <div className="rounded border px-3 py-2" style={{ borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" }}>
            <div className="font-bold text-gray-500 mb-1" style={{ fontSize: fontSize.body * 1.5 }}>CONDIÇÕES DE PAGAMENTO</div>
            <div className="text-gray-600" style={{ fontSize: fontSize.body * 1.5 }}>À Vista: 5% de desconto (PIX / Transferência Bancária) • Cartão: até 3x sem juros</div>
          </div>
        )}

        {/* Custom observacoes */}
        {sections.showObservacoes && (
          <div className="rounded border px-3 py-2" style={{ borderColor: "#FED7AA", backgroundColor: "#FFF7ED" }}>
            <div className="font-bold text-amber-700 mb-1" style={{ fontSize: fontSize.body * 1.5 }}>OBSERVAÇÕES DO ORÇAMENTO</div>
            <div className="text-amber-800" style={{ fontSize: fontSize.body * 1.5 }}>Área deve ser limpa antes do início dos serviços.</div>
          </div>
        )}

        {/* Clausulas padrao */}
        {sections.showObservacoesPadrao && (
          <div className="rounded border px-3 py-2" style={{ borderColor: "#E2E8F0" }}>
            <div className="font-bold text-blue-800 mb-1" style={{ fontSize: fontSize.body * 1.5 }}>OBSERVAÇÕES</div>
            <div className="text-gray-600" style={{ fontSize: fontSize.body * 1.45, lineHeight: 1.5 }}>
              1 - SE FAZ NECESSÁRIA A REGULARIZAÇÃO DA ÁREA A SER FEITA A IMPERMEABILIZAÇÃO...<br />
              2 - GARANTIMOS NOSSOS SERVIÇOS POR UM PERÍODO DE 05 (CINCO) ANOS...
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 mt-1 text-center text-white" style={{ backgroundColor: headerRgb, fontSize: fontSize.body * 1.4 }}>
        IMPP<span style={{ color: totalsRgb }}>EL</span>&nbsp;&nbsp;•&nbsp;&nbsp;(15) 99116-5611&nbsp;&nbsp;•&nbsp;&nbsp;vendas@imppel.com.br
      </div>
    </div>
  );
}

// ─── Slider Row ───────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, step = 0.5, unit = "mm", onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 dark:text-gray-400 w-40 flex-shrink-0">{label}</span>
      <Slider
        min={min} max={max} step={step} value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
      />
      <div className="w-16 text-right">
        <Input
          type="number" min={min} max={max} step={step}
          value={value}
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= min && v <= max) onChange(v); }}
          className="h-7 text-xs text-right px-1"
        />
      </div>
      <span className="text-xs text-gray-400 w-5">{unit}</span>
    </div>
  );
}

// ─── Section Toggle ───────────────────────────────────────────────────────────

function SectionToggle({ label, desc, checked, onChange, testId }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; testId?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} data-testid={testId} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuoteTemplates() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [config, setConfig] = useState<QuoteTemplateConfig>(DEFAULT_TEMPLATE_CONFIG);
  const [isDirty, setIsDirty] = useState(false);
  const [editorTab, setEditorTab] = useState("colunas");
  const [previewMode, setPreviewMode] = useState<MaterialDisplayMode>("material_mdo");
  const [showMaterialsPreview, setShowMaterialsPreview] = useState(true);

  const { data: templates = [], isLoading } = useQuery<QuoteTemplate[]>({
    queryKey: ["/api/quote-templates"],
    onSuccess: (data: QuoteTemplate[]) => {
      if (!selectedId && data.length > 0) {
        const def = data.find(t => t.isDefault) || data[0];
        loadTemplate(def);
      }
    },
  } as any);

  const loadTemplate = (t: QuoteTemplate) => {
    setSelectedId(t.id);
    setEditName(t.name);
    setConfig(parseConfig(t.config));
    setIsDirty(false);
  };

  const updateConfig = useCallback(<K extends keyof QuoteTemplateConfig>(key: K, value: QuoteTemplateConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async ({ asNew, setAsDefault }: { asNew: boolean; setAsDefault: boolean }) => {
      const payload = { name: editName, config: JSON.stringify(config), isDefault: setAsDefault };
      if (asNew || !selectedId) {
        return apiRequest("POST", "/api/quote-templates", payload);
      } else {
        return apiRequest("PUT", `/api/quote-templates/${selectedId}`, payload);
      }
    },
    onSuccess: async (res, { setAsDefault, asNew }) => {
      const saved = await res.json();
      if (setAsDefault) {
        await apiRequest("POST", `/api/quote-templates/${saved.id}/set-default`, {});
      }
      queryClient.invalidateQueries({ queryKey: ["/api/quote-templates"] });
      setSelectedId(saved.id);
      setIsDirty(false);
      toast({ title: asNew ? "Novo template criado!" : "Template salvo!", description: setAsDefault ? "Definido como padrão para todos os orçamentos." : undefined });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/quote-templates/${id}/set-default`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/quote-templates"] }); toast({ title: "Template padrão atualizado!" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/quote-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quote-templates"] });
      setSelectedId(null);
      setConfig(DEFAULT_TEMPLATE_CONFIG);
      setIsDirty(false);
      toast({ title: "Template removido." });
    },
  });

  const createDefault = useMutation({
    mutationFn: () => apiRequest("POST", "/api/quote-templates", { name: "Template Padrão IMPPEL", isDefault: true, config: JSON.stringify(DEFAULT_TEMPLATE_CONFIG) }),
    onSuccess: async (res) => {
      const saved = await res.json();
      await apiRequest("POST", `/api/quote-templates/${saved.id}/set-default`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/quote-templates"] });
      loadTemplate({ ...saved, isDefault: true });
      toast({ title: "Template padrão criado!" });
    },
  });

  const totalColW = config.columns.item + config.columns.desc + config.columns.unid + config.columns.qtde + config.columns.unit + config.columns.total;
  const contentW = 210 - config.margins.left * 2;
  const colError = Math.abs(totalColW - contentW) > 2;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Left: Template list ─────────────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm">
            <LayoutTemplate className="w-4 h-4 text-blue-700" />Templates de Orçamento
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" />Carregando...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm space-y-3">
              <FileText className="w-8 h-8 mx-auto opacity-40" />
              <p>Nenhum template ainda.</p>
              <Button size="sm" onClick={() => createDefault.mutate()} disabled={createDefault.isPending} className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs" data-testid="btn-create-default">
                {createDefault.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                Criar Template Padrão
              </Button>
            </div>
          ) : (
            templates.map(t => (
              <button
                key={t.id}
                onClick={() => loadTemplate(t)}
                className={`w-full text-left rounded-xl p-3 transition-all border ${selectedId === t.id ? "bg-blue-700 text-white border-blue-600" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400"}`}
                data-testid={`template-item-${t.id}`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className={`text-sm font-medium leading-tight ${selectedId === t.id ? "text-white" : "text-gray-800 dark:text-gray-200"}`}>{t.name}</span>
                  {t.isDefault && <Star className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${selectedId === t.id ? "text-yellow-300" : "text-yellow-500"}`} />}
                </div>
                {t.isDefault && <span className={`text-xs mt-1 block ${selectedId === t.id ? "text-blue-200" : "text-blue-600"}`}>✓ Template padrão</span>}
              </button>
            ))
          )}
        </div>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Button size="sm" variant="outline" onClick={() => { setSelectedId(null); setEditName("Novo Template"); setConfig(DEFAULT_TEMPLATE_CONFIG); setIsDirty(true); }} className="w-full text-xs gap-1.5" data-testid="btn-new-template">
            <Plus className="w-3.5 h-3.5" />Novo Template
          </Button>
        </div>
      </div>

      {/* ── Right: Editor + Preview ─────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor panel */}
        <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="w-4 h-4 text-blue-700" />
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Editor de Template</span>
              {isDirty && <Badge variant="outline" className="text-xs text-orange-600 border-orange-400">Não salvo</Badge>}
            </div>
            <Input
              value={editName}
              onChange={e => { setEditName(e.target.value); setIsDirty(true); }}
              placeholder="Nome do template"
              className="h-8 text-sm"
              data-testid="input-template-name"
            />
          </div>

          {/* Editor tabs */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={editorTab} onValueChange={setEditorTab}>
              <TabsList className="w-full rounded-none border-b border-gray-200 dark:border-gray-700 grid grid-cols-4 h-9">
                <TabsTrigger value="colunas" className="text-xs" data-testid="tab-colunas"><Columns className="w-3 h-3 mr-1" />Colunas</TabsTrigger>
                <TabsTrigger value="layout" className="text-xs" data-testid="tab-layout"><Maximize2 className="w-3 h-3 mr-1" />Layout</TabsTrigger>
                <TabsTrigger value="cores" className="text-xs" data-testid="tab-cores"><Palette className="w-3 h-3 mr-1" />Cores</TabsTrigger>
                <TabsTrigger value="secoes" className="text-xs" data-testid="tab-secoes"><ToggleLeft className="w-3 h-3 mr-1" />Seções</TabsTrigger>
              </TabsList>

              {/* Colunas */}
              <TabsContent value="colunas" className="p-4 space-y-5 m-0">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tabela de Serviços (mm)</p>
                  {colError && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2 text-xs text-orange-700 dark:text-orange-400 mb-3">
                      ⚠ Total atual: <strong>{totalColW}mm</strong> — Conteúdo disponível: <strong>{contentW}mm</strong>. Ajuste as colunas.
                    </div>
                  )}
                  <div className="space-y-3">
                    <SliderRow label="ITEM" value={config.columns.item} min={8} max={25} onChange={v => updateConfig("columns", { ...config.columns, item: v })} />
                    <SliderRow label="DESCRIÇÃO" value={config.columns.desc} min={40} max={130} onChange={v => updateConfig("columns", { ...config.columns, desc: v })} />
                    <SliderRow label="UNID." value={config.columns.unid} min={8} max={25} onChange={v => updateConfig("columns", { ...config.columns, unid: v })} />
                    <SliderRow label="QUANTIDADE" value={config.columns.qtde} min={15} max={40} onChange={v => updateConfig("columns", { ...config.columns, qtde: v })} />
                    <SliderRow label="UNITÁRIO" value={config.columns.unit} min={15} max={40} onChange={v => updateConfig("columns", { ...config.columns, unit: v })} />
                    <SliderRow label="TOTAL" value={config.columns.total} min={15} max={40} onChange={v => updateConfig("columns", { ...config.columns, total: v })} />
                  </div>
                  <div className="mt-3 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-center text-gray-500">
                    Soma: <span className={colError ? "text-orange-600 font-bold" : "text-green-600 font-bold"}>{totalColW}mm</span>
                    &nbsp;/ {contentW}mm disponíveis
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Seção de Clientes — Largura das colunas (mm)</p>
                  <p className="text-xs text-gray-400 mb-3">A coluna Endereço/Cidade ocupa o espaço restante automaticamente.</p>
                  <div className="space-y-3">
                    <SliderRow label="Nome / Parte" value={config.clientColumns.nome} min={40} max={100} onChange={v => updateConfig("clientColumns", { ...config.clientColumns, nome: v })} />
                    <SliderRow label="Cargo / Papel" value={config.clientColumns.cargo} min={20} max={60} onChange={v => updateConfig("clientColumns", { ...config.clientColumns, cargo: v })} />
                    <SliderRow label="Telefone" value={config.clientColumns.telefone} min={18} max={45} onChange={v => updateConfig("clientColumns", { ...config.clientColumns, telefone: v })} />
                  </div>
                  <div className="mt-3 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-center text-gray-500">
                    Endereço ocupa: <span className="text-blue-600 font-bold">{Math.max(0, contentW - config.clientColumns.nome - config.clientColumns.cargo - config.clientColumns.telefone)}mm</span>
                  </div>
                </div>
              </TabsContent>

              {/* Layout */}
              <TabsContent value="layout" className="p-4 space-y-5 m-0">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Margens</p>
                  <SliderRow label="Margem lateral" value={config.margins.left} min={5} max={25} onChange={v => updateConfig("margins", { left: v })} />
                </div>
                <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Espaçamento — Tabela de Serviços</p>
                  <SliderRow label="Padding superior" value={config.rowPadding.top} min={1} max={12} onChange={v => updateConfig("rowPadding", { ...config.rowPadding, top: v })} />
                  <SliderRow label="Padding inferior" value={config.rowPadding.bottom} min={1} max={12} onChange={v => updateConfig("rowPadding", { ...config.rowPadding, bottom: v })} />
                </div>
                <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Espaçamento — Seções (Clientes, Responsáveis)</p>
                  <SliderRow label="Padding superior" value={config.sectionPadding.top} min={1} max={10} onChange={v => updateConfig("sectionPadding", { ...config.sectionPadding, top: v })} />
                  <SliderRow label="Padding inferior" value={config.sectionPadding.bottom} min={1} max={10} onChange={v => updateConfig("sectionPadding", { ...config.sectionPadding, bottom: v })} />
                </div>
                <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tamanhos de fonte (pt)</p>
                  <SliderRow label="Cabeçalho de tabela" value={config.fontSize.header} min={6} max={14} unit="pt" onChange={v => updateConfig("fontSize", { ...config.fontSize, header: v })} />
                  <SliderRow label="Corpo / Linhas" value={config.fontSize.body} min={6} max={13} unit="pt" onChange={v => updateConfig("fontSize", { ...config.fontSize, body: v })} />
                  <SliderRow label="Totais" value={config.fontSize.totals} min={6} max={14} unit="pt" onChange={v => updateConfig("fontSize", { ...config.fontSize, totals: v })} />
                  <SliderRow label="Data do orçamento" value={config.fontSize.date} min={7} max={16} unit="pt" onChange={v => updateConfig("fontSize", { ...config.fontSize, date: v })} />
                </div>
              </TabsContent>

              {/* Cores */}
              <TabsContent value="cores" className="p-4 space-y-5 m-0">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cores do documento</p>

                  <div className="space-y-2">
                    <Label className="text-sm">Cor do cabeçalho (fundo das tabelas, header)</Label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg border-2 border-gray-300 flex-shrink-0 overflow-hidden">
                        <input type="color" value={config.headerColor} onChange={e => updateConfig("headerColor", e.target.value)} className="w-12 h-12 -translate-x-1 -translate-y-1 cursor-pointer" data-testid="input-header-color" />
                      </div>
                      <Input value={config.headerColor} onChange={e => updateConfig("headerColor", e.target.value)} className="font-mono text-sm uppercase" maxLength={7} />
                    </div>
                    <p className="text-xs text-gray-400">Afeta o cabeçalho, barra de título das tabelas e rodapé.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Cor de destaque / totais</Label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg border-2 border-gray-300 flex-shrink-0 overflow-hidden">
                        <input type="color" value={config.totalsColor} onChange={e => updateConfig("totalsColor", e.target.value)} className="w-12 h-12 -translate-x-1 -translate-y-1 cursor-pointer" data-testid="input-totals-color" />
                      </div>
                      <Input value={config.totalsColor} onChange={e => updateConfig("totalsColor", e.target.value)} className="font-mono text-sm uppercase" maxLength={7} />
                    </div>
                    <p className="text-xs text-gray-400">Afeta a barra "TOTAL GERAL" e o logotipo.</p>
                  </div>

                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500">Pré-visualizações de cor:</p>
                    <div className="flex gap-2">
                      <div className="flex-1 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: config.headerColor }}>Cabeçalho</div>
                      <div className="flex-1 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: config.totalsColor }}>Total</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { updateConfig("headerColor", "#1E3A8A"); updateConfig("totalsColor", "#F97316"); }} className="w-full text-xs gap-1">
                      <RotateCcw className="w-3 h-3" />Restaurar cores padrão IMPPEL
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Seções */}
              <TabsContent value="secoes" className="p-4 m-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Seções visíveis no PDF</p>
                <div className="space-y-0">
                  <SectionToggle
                    label="Clientes / Partes Envolvidas"
                    desc="Tabela com nome, cargo e contato do cliente"
                    checked={config.sections.showClientes}
                    onChange={v => updateConfig("sections", { ...config.sections, showClientes: v })}
                    testId="toggle-showClientes"
                  />
                  <SectionToggle
                    label="Responsáveis / Equipe Técnica"
                    desc="Tabela com encarregado e equipe"
                    checked={config.sections.showResponsaveis}
                    onChange={v => updateConfig("sections", { ...config.sections, showResponsaveis: v })}
                    testId="toggle-showResponsaveis"
                  />
                  <SectionToggle
                    label="Condições de Pagamento"
                    desc="Formas e condições de pagamento aceitas"
                    checked={config.sections.showPaymentConditions}
                    onChange={v => updateConfig("sections", { ...config.sections, showPaymentConditions: v })}
                    testId="toggle-showPaymentConditions"
                  />
                  <SectionToggle
                    label="Observações Personalizadas"
                    desc="Campo de observações específicas do orçamento"
                    checked={config.sections.showObservacoes}
                    onChange={v => updateConfig("sections", { ...config.sections, showObservacoes: v })}
                    testId="toggle-showObservacoes"
                  />
                  <SectionToggle
                    label="Cláusulas Padrão (Observações)"
                    desc="6 cláusulas contratuais padrão IMPPEL"
                    checked={config.sections.showObservacoesPadrao}
                    onChange={v => updateConfig("sections", { ...config.sections, showObservacoesPadrao: v })}
                    testId="toggle-showObservacoesPadrao"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Save actions */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 space-y-2">
            {selectedId && (
              <div className="flex gap-2">
                {!templates.find(t => t.id === selectedId)?.isDefault && (
                  <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={() => setDefaultMutation.mutate(selectedId!)} disabled={setDefaultMutation.isPending} data-testid="btn-set-default">
                    <Star className="w-3 h-3" />Definir como Padrão
                  </Button>
                )}
                <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={() => { if (confirm("Remover este template?")) deleteMutation.mutate(selectedId!); }} disabled={deleteMutation.isPending} data-testid="btn-delete-template">
                  <Trash2 className="w-3 h-3" />Remover
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={() => saveMutation.mutate({ asNew: true, setAsDefault: false })} disabled={saveMutation.isPending || !editName} data-testid="btn-save-as-new">
                {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Salvar como Novo
              </Button>
              <Button size="sm" className="flex-1 text-xs gap-1 bg-blue-700 hover:bg-blue-800 text-white" onClick={() => saveMutation.mutate({ asNew: false, setAsDefault: false })} disabled={saveMutation.isPending || !editName} data-testid="btn-save-template">
                {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Salvar Template
              </Button>
            </div>
            <Button size="sm" className="w-full text-xs gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => saveMutation.mutate({ asNew: !selectedId, setAsDefault: true })} disabled={saveMutation.isPending || !editName} data-testid="btn-save-as-default">
              {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Salvar como Padrão (usar em todos os orçamentos)
            </Button>
          </div>
        </div>

        {/* Live preview panel */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Eye className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Pré-visualização em tempo real</span>
            <Badge variant="outline" className="text-xs">Simulação do PDF</Badge>
            <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
              <Select
                value={previewMode}
                onValueChange={(v) => setPreviewMode(v as MaterialDisplayMode)}
              >
                <SelectTrigger
                  className="h-8 text-xs w-48"
                  data-testid="select-preview-mode"
                >
                  <SelectValue placeholder="Modo de visualização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material_mdo" data-testid="option-material-mdo">
                    Materiais + MO (padrão)
                  </SelectItem>
                  <SelectItem value="mdo_lista" data-testid="option-mdo-lista">
                    MO + Lista de Materiais
                  </SelectItem>
                  <SelectItem value="material_separado" data-testid="option-material-separado">
                    Materiais Separados
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5">
                <Switch
                  id="switch-show-materials"
                  checked={showMaterialsPreview}
                  onCheckedChange={setShowMaterialsPreview}
                  data-testid="switch-show-materials"
                />
                <Label htmlFor="switch-show-materials" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer whitespace-nowrap">
                  Mostrar preços
                </Label>
              </div>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white gap-2 text-xs font-semibold shadow-md"
                data-testid="btn-preview-real"
                onClick={() => {
                  try {
                    const url = gerarOrcamentoPDFPreview(config, previewMode, showMaterialsPreview);
                    window.open(url, "_blank");
                  } catch (e: any) {
                    toast({ title: "Erro ao gerar preview", description: e?.message, variant: "destructive" });
                  }
                }}
              >
                <PlayCircle className="w-4 h-4" />
                Gerar Preview Real
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="max-w-2xl">
            <PDFPreview config={config} />
          </div>
          <p className="text-xs text-gray-400 mt-3 max-w-2xl">
            A simulação visual reflete o layout. Clique em <strong>Gerar Preview Real</strong> para abrir o PDF exato que será entregue ao cliente.
          </p>
        </div>
      </div>
    </div>
  );
}
