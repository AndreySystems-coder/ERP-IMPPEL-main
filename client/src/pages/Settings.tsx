import React, { useState, useEffect } from "react";
import { useSettings, useUpdateBulkSettings } from "@/hooks/use-settings";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Save, Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  const { data: settings = [], isLoading } = useSettings();
  const updateSettings = useUpdateBulkSettings();

  const [formState, setFormState] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings.length > 0) {
      const init: Record<string, string> = {};
      settings.forEach((s: any) => {
        init[s.key] = s.value.toString();
      });
      // ensure defaults exist in UI even if not in DB yet
      if (!init.targetMargin) init.targetMargin = "0.20";
      if (!init.taxRate) init.taxRate = "0.10";
      if (!init.fixedCostAllocation) init.fixedCostAllocation = "0.15";
      setFormState(init);
    } else if (!isLoading) {
      setFormState({
        targetMargin: "0.20",
        taxRate: "0.10",
        fixedCostAllocation: "0.15"
      });
    }
  }, [settings, isLoading]);

  const handleSave = async () => {
    const payload = Object.entries(formState).map(([key, value]) => ({
      key,
      value: Number(value)
    }));
    await updateSettings.mutateAsync({ settings: payload });
    alert("Configurações salvas com sucesso!");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Configurações do Sistema
        </h1>
        <p className="text-slate-500 mt-1">Configure as taxas padrão e regras usadas em todo o ERP.</p>
      </div>

      <Card>
        <div className="px-6 py-5 border-b border-border bg-slate-50/50">
          <h3 className="text-lg font-bold font-display">Regras de Preços</h3>
        </div>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Margem de Lucro Alvo</label>
              <div className="relative">
                <input 
                  type="number" step="0.01"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all pl-12 font-medium"
                  value={formState.targetMargin || ''}
                  onChange={e => setFormState(p => ({...p, targetMargin: e.target.value}))}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
              <p className="text-xs text-slate-500">Ex: 0.20 = 20%</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Taxa de Imposto Padrão</label>
              <div className="relative">
                <input 
                  type="number" step="0.01"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all pl-12 font-medium"
                  value={formState.taxRate || ''}
                  onChange={e => setFormState(p => ({...p, taxRate: e.target.value}))}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
              <p className="text-xs text-slate-500">Ex: 0.10 = 10% aplicado ao preço base final</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Alocação de Custos Fixos</label>
              <div className="relative">
                <input 
                  type="number" step="0.01"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all pl-12 font-medium"
                  value={formState.fixedCostAllocation || ''}
                  onChange={e => setFormState(p => ({...p, fixedCostAllocation: e.target.value}))}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
              <p className="text-xs text-slate-500">Percentual de custos diretos adicionados como despesas gerais. Ex: 0.15 = 15%</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Ajuste Regional - Zona B (até 50km)</label>
              <div className="relative">
                <input 
                  type="number" step="0.01"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all pl-12 font-medium"
                  value={formState.regionBZonePercent || ''}
                  onChange={e => setFormState(p => ({...p, regionBZonePercent: e.target.value}))}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
              <p className="text-xs text-slate-500">Percentual adicional no preço. Ex: 0.15 = 15%</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Ajuste Regional - Zona C (acima de 100km)</label>
              <div className="relative">
                <input 
                  type="number" step="0.01"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all pl-12 font-medium"
                  value={formState.regionCZonePercent || ''}
                  onChange={e => setFormState(p => ({...p, regionCZonePercent: e.target.value}))}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              </div>
              <p className="text-xs text-slate-500">Percentual adicional no preço. Ex: 0.25 = 25%</p>
            </div>
          </div>

          <div className="pt-6 border-t mt-6">
            <Button onClick={handleSave} isLoading={updateSettings.isPending} size="lg">
              <Save className="w-5 h-5 mr-2" /> Salvar Todas as Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
