import React, { useState, useEffect } from "react";
import { usePriorityRules, useUpdatePriorityRules } from "@/hooks/use-priority-rules";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { AlertCircle, Save, Settings } from "lucide-react";
import type { PriorityRules } from "@shared/schema";

const DEFAULT_RULES: Partial<PriorityRules> = {
  mantaAsfálticaScore: 5,
  piscinaScore: 3,
  reparoScore: 2,
  sizeGrandeThreshold: 20,
  sizeGrandeScore: 4,
  sizeMédioMin: 10,
  sizeMédioMax: 20,
  sizeMédioScore: 2,
  sizePequenoScore: 1,
  distancePróximoThreshold: 10,
  distancePróximoScore: 3,
  distanceMédioMin: 10,
  distanceMédioMax: 25,
  distanceMédioScore: 2,
  distanceLongeScore: 0,
  returnAltoScore: 4,
  returnMédioScore: 2,
  returnBaixoScore: 0,
  priorityAltaThreshold: 12,
  priorityMédiaMin: 8,
  priorityBaixaMax: 7,
  autoRejectThreshold: 7,
  badFactorCountThreshold: 2,
};

export default function PriorityRules() {
  const { data: rules = {}, isLoading } = usePriorityRules();
  const updateRules = useUpdatePriorityRules();
  const [formState, setFormState] = useState<Record<string, number>>({});
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    if (Object.keys(rules).length > 0) {
      const init: Record<string, number> = {};
      Object.entries(rules).forEach(([key, value]) => {
        if (typeof value === "number") {
          init[key] = value;
        }
      });
      setFormState(init);
    } else if (!isLoading) {
      setFormState(DEFAULT_RULES as Record<string, number>);
    }
  }, [rules, isLoading]);

  const handleChange = (key: string, value: string) => {
    setFormState(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
    setHasChanged(true);
  };

  const handleSave = async () => {
    await updateRules.mutateAsync(formState as Partial<PriorityRules>);
    setHasChanged(false);
    alert("Regras de prioridade atualizadas com sucesso!");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          Regras de Prioridade Imppel
        </h1>
        <p className="text-slate-500 mt-1">Configure os critérios de pontuação para classificação automática de serviços.</p>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">Como funciona o sistema:</p>
            <p className="text-sm text-blue-800 mt-1">
              Cada serviço recebe uma pontuação baseada no tipo, tamanho, distância e retorno financeiro.
              A soma determina se o serviço será: Aceito (ALTA ≥12), Reorganizado (MÉDIA 8-11) ou Recusado (BAIXA ≤7).
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type Scores */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-bold text-slate-900 mb-4">📋 Tipo de Serviço</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Manta Asfáltica</label>
              <Input 
                type="number"
                step="0.1"
                value={formState.mantaAsfálticaScore || 0}
                onChange={(e) => handleChange("mantaAsfálticaScore", e.target.value)}
                data-testid="input-manta-asfaltica-score"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Piscina / Argamassa</label>
              <Input 
                type="number"
                step="0.1"
                value={formState.piscinaScore || 0}
                onChange={(e) => handleChange("piscinaScore", e.target.value)}
                data-testid="input-piscina-score"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Manta Líquida / Reparo</label>
              <Input 
                type="number"
                step="0.1"
                value={formState.reparoScore || 0}
                onChange={(e) => handleChange("reparoScore", e.target.value)}
                data-testid="input-reparo-score"
              />
            </div>
          </CardContent>
        </Card>

        {/* Size Scores */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-bold text-slate-900 mb-4">📏 Tamanho (m²)</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Grande (≥)</label>
                <Input 
                  type="number"
                  value={formState.sizeGrandeThreshold || 0}
                  onChange={(e) => handleChange("sizeGrandeThreshold", e.target.value)}
                  data-testid="input-size-grande-threshold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pontos</label>
                <Input 
                  type="number"
                  step="0.1"
                  value={formState.sizeGrandeScore || 0}
                  onChange={(e) => handleChange("sizeGrandeScore", e.target.value)}
                  data-testid="input-size-grande-score"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Médio Min</label>
                <Input 
                  type="number"
                  value={formState.sizeMédioMin || 0}
                  onChange={(e) => handleChange("sizeMédioMin", e.target.value)}
                  data-testid="input-size-medio-min"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Médio Max</label>
                <Input 
                  type="number"
                  value={formState.sizeMédioMax || 0}
                  onChange={(e) => handleChange("sizeMédioMax", e.target.value)}
                  data-testid="input-size-medio-max"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Pontos</label>
                <Input 
                  type="number"
                  step="0.1"
                  value={formState.sizeMédioScore || 0}
                  onChange={(e) => handleChange("sizeMédioScore", e.target.value)}
                  data-testid="input-size-medio-score"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pequeno (&lt;10m²)</label>
              <Input 
                type="number"
                step="0.1"
                value={formState.sizePequenoScore || 0}
                onChange={(e) => handleChange("sizePequenoScore", e.target.value)}
                data-testid="input-size-pequeno-score"
              />
            </div>
          </CardContent>
        </Card>

        {/* Distance Scores */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-bold text-slate-900 mb-4">📍 Distância (km)</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Próximo (≤)</label>
                <Input 
                  type="number"
                  value={formState.distancePróximoThreshold || 0}
                  onChange={(e) => handleChange("distancePróximoThreshold", e.target.value)}
                  data-testid="input-distance-proximo-threshold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pontos</label>
                <Input 
                  type="number"
                  step="0.1"
                  value={formState.distancePróximoScore || 0}
                  onChange={(e) => handleChange("distancePróximoScore", e.target.value)}
                  data-testid="input-distance-proximo-score"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Médio Min</label>
                <Input 
                  type="number"
                  value={formState.distanceMédioMin || 0}
                  onChange={(e) => handleChange("distanceMédioMin", e.target.value)}
                  data-testid="input-distance-medio-min"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Médio Max</label>
                <Input 
                  type="number"
                  value={formState.distanceMédioMax || 0}
                  onChange={(e) => handleChange("distanceMédioMax", e.target.value)}
                  data-testid="input-distance-medio-max"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Pontos</label>
                <Input 
                  type="number"
                  step="0.1"
                  value={formState.distanceMédioScore || 0}
                  onChange={(e) => handleChange("distanceMédioScore", e.target.value)}
                  data-testid="input-distance-medio-score"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Longe (&gt;25km)</label>
              <Input 
                type="number"
                step="0.1"
                value={formState.distanceLongeScore || 0}
                onChange={(e) => handleChange("distanceLongeScore", e.target.value)}
                data-testid="input-distance-longe-score"
              />
            </div>
          </CardContent>
        </Card>

        {/* Return Scores */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-bold text-slate-900 mb-4">💰 Retorno Financeiro</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alto</label>
              <Input 
                type="number"
                step="0.1"
                value={formState.returnAltoScore || 0}
                onChange={(e) => handleChange("returnAltoScore", e.target.value)}
                data-testid="input-return-alto-score"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Médio</label>
              <Input 
                type="number"
                step="0.1"
                value={formState.returnMédioScore || 0}
                onChange={(e) => handleChange("returnMédioScore", e.target.value)}
                data-testid="input-return-medio-score"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Baixo</label>
              <Input 
                type="number"
                step="0.1"
                value={formState.returnBaixoScore || 0}
                onChange={(e) => handleChange("returnBaixoScore", e.target.value)}
                data-testid="input-return-baixo-score"
              />
            </div>
          </CardContent>
        </Card>

        {/* Priority Thresholds */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-bold text-slate-900 mb-4">⭐ Limites de Prioridade</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alta (≥)</label>
              <Input 
                type="number"
                step="0.1"
                value={formState.priorityAltaThreshold || 0}
                onChange={(e) => handleChange("priorityAltaThreshold", e.target.value)}
                data-testid="input-priority-alta-threshold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Média (≥)</label>
              <Input 
                type="number"
                step="0.1"
                value={formState.priorityMédiaMin || 0}
                onChange={(e) => handleChange("priorityMédiaMin", e.target.value)}
                data-testid="input-priority-media-min"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Baixa (≤)</label>
              <Input 
                type="number"
                step="0.1"
                value={formState.priorityBaixaMax || 0}
                onChange={(e) => handleChange("priorityBaixaMax", e.target.value)}
                data-testid="input-priority-baixa-max"
              />
            </div>
          </CardContent>
        </Card>

        {/* Auto-Reject Rules */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-bold text-slate-900 mb-4">🚫 Regras de Recusa Automática</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Recusar se pontuação ≤</label>
              <Input 
                type="number"
                step="0.1"
                value={formState.autoRejectThreshold || 0}
                onChange={(e) => handleChange("autoRejectThreshold", e.target.value)}
                data-testid="input-auto-reject-threshold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E tiver ≥ fatores ruins</label>
              <Input 
                type="number"
                value={formState.badFactorCountThreshold || 0}
                onChange={(e) => handleChange("badFactorCountThreshold", e.target.value)}
                data-testid="input-bad-factor-count-threshold"
              />
              <p className="text-xs text-slate-600 mt-2">Fatores ruins: pequeno + longe + baixo retorno</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 justify-end">
        {hasChanged && (
          <Button 
            variant="outline" 
            onClick={() => {
              setFormState(DEFAULT_RULES as Record<string, number>);
              setHasChanged(false);
            }}
            data-testid="button-reset-rules"
          >
            Resetar
          </Button>
        )}
        <Button 
          onClick={handleSave}
          isLoading={updateRules.isPending}
          disabled={!hasChanged}
          data-testid="button-save-rules"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Regras
        </Button>
      </div>
    </div>
  );
}
