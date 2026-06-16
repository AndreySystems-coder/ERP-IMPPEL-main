import { AlertTriangle, CheckCircle, FileText, TrendingUp, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/Card";
import { Input } from "@/components/Input";
import type { MaterialDisplayMode } from "@/lib/orcamentoPDF";

interface QuoteFinancialAnalysisProps {
  distanceKm: string;
  onDistanceKmChange: (value: string) => void;
  multiCostAnalysis: any;
  directCostNum: number;
  locationRegion: string;
  regionalAdjustmentPercent: number;
  discountPercent: string;
  onDiscountPercentChange: (value: string) => void;
  discountNum: number;
  discountValidation: any;
  priceAfterDiscount: number;
  totalOrcamento: number;
  marginEval: any;
  combinedRec: any;
  costConfig: any;
  materialDisplayMode: MaterialDisplayMode;
  onMaterialDisplayModeChange: (mode: MaterialDisplayMode) => void;
  showMaterialsToClient: boolean;
  onShowMaterialsToClientChange: (value: boolean) => void;
  privacyMaskEnabled?: boolean;
  maskMoney?: (value: unknown) => string;
}

export function QuoteFinancialAnalysis({
  distanceKm,
  onDistanceKmChange,
  multiCostAnalysis,
  directCostNum,
  locationRegion,
  regionalAdjustmentPercent,
  discountPercent,
  onDiscountPercentChange,
  discountNum,
  discountValidation,
  priceAfterDiscount,
  totalOrcamento,
  marginEval,
  combinedRec,
  costConfig,
  materialDisplayMode,
  onMaterialDisplayModeChange,
  showMaterialsToClient,
  onShowMaterialsToClientChange,
  privacyMaskEnabled = false,
  maskMoney = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
}: QuoteFinancialAnalysisProps) {
  return (
    <section id="quote-valores" className="scroll-mt-28 space-y-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
      <Input label="Distância (km)" type="number" step="0.1" min="0" value={distanceKm} onChange={(event) => onDistanceKmChange(event.target.value)} placeholder="0.0" data-testid="input-distance-km" />

      {multiCostAnalysis && directCostNum > 0 && (
        <div className="space-y-3">
          <Card className="border border-slate-200">
            <CardContent className="pt-4 pb-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Composição de custos</p>
              <div className="grid grid-cols-1 gap-2 text-center text-xs sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="mb-0.5 text-slate-500">Materiais</p>
                  <p className="font-bold text-slate-800">{maskMoney(multiCostAnalysis.materialCost)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="mb-0.5 text-slate-500">Mão de obra</p>
                  <p className="font-bold text-slate-800">{maskMoney(multiCostAnalysis.laborCost)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="mb-0.5 text-slate-500">Transporte</p>
                  <p className="font-bold text-slate-800">{maskMoney(multiCostAnalysis.transportCost)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-sm font-semibold text-slate-700">Custo direto total</span>
                <span className="font-bold text-slate-900">{maskMoney(directCostNum)}</span>
              </div>
              {multiCostAnalysis.suggestedPrice > 0 && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Preço sugerido</span>
                  <span className="font-bold text-emerald-700">{maskMoney(multiCostAnalysis.suggestedPrice)}</span>
                </div>
              )}
              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold">Regra regional: {locationRegion}</span>
                  <span>{(regionalAdjustmentPercent * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% sobre materiais</span>
                </div>
                {multiCostAnalysis.materialRegionalIncrease > 0 ? (
                  <p className="mt-1">
                    Materiais antes da regra: {maskMoney(multiCostAnalysis.baseMaterialCost)} · impacto: {maskMoney(multiCostAnalysis.materialRegionalIncrease)}
                  </p>
                ) : (
                  <p className="mt-1">Zona A padrão, sem acréscimo regional.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Simular desconto</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input type="number" min="0" max="100" step="0.5" placeholder="0" value={discountPercent} onChange={(event) => onDiscountPercentChange(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" data-testid="input-discount" />
              {discountNum > 0 && (
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-xs text-slate-500">Preço com desconto</p>
                  <p className={`text-base font-bold ${discountValidation?.isBlocked ? "text-red-600" : "text-slate-900"}`}>
                    {maskMoney(priceAfterDiscount)}
                  </p>
                </div>
              )}
            </div>
            {discountValidation && (
              <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${discountValidation.isBlocked ? "border border-red-200 bg-red-50 text-red-700" : discountValidation.newMargin < (costConfig?.minMarginPercent || 0.3) ? "border border-amber-200 bg-amber-50 text-amber-700" : "border border-green-200 bg-green-50 text-green-700"}`}>
                {discountValidation.reason}
              </p>
            )}
          </div>

          {marginEval && !discountValidation?.isBlocked && (
            <div className={`rounded-lg border-2 p-4 ${marginEval.status === "ACEITAR" ? "border-emerald-300 bg-emerald-50" : marginEval.status === "ALERTA" ? "border-amber-300 bg-amber-50" : "border-red-300 bg-red-50"}`} data-testid="margin-evaluation-banner">
              <div className="flex items-start gap-3">
                {marginEval.status === "ACEITAR" ? <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : marginEval.status === "ALERTA" ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-bold ${marginEval.status === "ACEITAR" ? "text-emerald-700" : marginEval.status === "ALERTA" ? "text-amber-700" : "text-red-700"}`}>{marginEval.status}</span>
                    <span className="ml-auto text-lg font-bold">{(marginEval.marginPercent * 100).toFixed(1)}%</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{marginEval.reason}</p>
                </div>
              </div>
            </div>
          )}

          {discountValidation?.isBlocked && (
            <div className="flex items-center gap-3 rounded-lg border-2 border-red-400 bg-red-50 p-4" data-testid="discount-blocked-banner">
              <XCircle className="h-5 w-5 shrink-0 text-red-600" />
              <div><p className="font-bold text-red-700">DESCONTO BLOQUEADO</p><p className="text-sm text-red-600">{discountValidation.reason}</p></div>
            </div>
          )}

          {combinedRec && !discountValidation?.isBlocked && (
            <div className={`rounded-lg border-2 p-4 ${combinedRec.color === "green" ? "border-emerald-400 bg-emerald-50" : combinedRec.color === "yellow" ? "border-amber-400 bg-amber-50" : combinedRec.color === "blue" ? "border-blue-400 bg-blue-50" : "border-red-400 bg-red-50"}`} data-testid="combined-recommendation-banner">
              <div className="flex items-start gap-3">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Recomendação geral</p>
                  <p className="text-sm font-bold text-slate-800">{combinedRec.recommendation}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{combinedRec.reason}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border-2 border-primary/30 bg-primary/5 px-4 py-3" data-testid="display-real-price-wrapper">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Preço vendido</p>
        <p className="text-2xl font-bold text-primary" data-testid="display-real-price">
          {maskMoney(priceAfterDiscount)}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {discountNum > 0
            ? `${privacyMaskEnabled ? "R$ ••••" : totalOrcamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} com ${discountNum}% de desconto aplicado`
            : "Soma dos serviços. Aplique desconto acima se necessário."}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-slate-500" />
          <label className="text-sm font-semibold text-slate-700">Apresentação de materiais no PDF</label>
        </div>
        <select value={materialDisplayMode} onChange={(event) => onMaterialDisplayModeChange(event.target.value as MaterialDisplayMode)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" data-testid="select-material-display-mode">
          <option value="material_mdo">1. Material + mão de obra</option>
          <option value="mdo_lista">2. Apenas mão de obra + lista de materiais</option>
          <option value="material_separado">3. Material separado + mão de obra</option>
        </select>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2">
          <div>
            <p className="text-sm font-medium text-slate-700">Exibir materiais para o cliente</p>
            <p className="text-xs text-slate-400">{showMaterialsToClient ? "Cliente verá os detalhes conforme o modo selecionado" : "Cliente verá apenas o total geral"}</p>
          </div>
          <button type="button" onClick={() => onShowMaterialsToClientChange(!showMaterialsToClient)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${showMaterialsToClient ? "bg-primary" : "bg-slate-300"}`} data-testid="toggle-show-materials" aria-label="Toggle exibir materiais">
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${showMaterialsToClient ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>
    </section>
  );
}
