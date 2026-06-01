import React, { useState, useEffect } from "react";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Calculator, ArrowRight, DollarSign, PieChart } from "lucide-react";

export default function PriceCalculator() {
  const { data: settings } = useSettings();
  
  const [sqMeters, setSqMeters] = useState("100");
  const [matCost, setMatCost] = useState("0");
  const [labCost, setLabCost] = useState("0");
  const [transCost, setTransCost] = useState("0");
  const [regionZone, setRegionZone] = useState("A");

  const getSetting = (key: string, defaultVal: number) => {
    if (!settings) return defaultVal;
    const s = settings.find((s: any) => s.key === key);
    return s ? s.value : defaultVal;
  };

  const m = Number(sqMeters) || 0;
  const mc = Number(matCost) || 0;
  const lc = Number(labCost) || 0;
  const tc = Number(transCost) || 0;

  const fcaRate = getSetting("fixedCostAllocation", 0.15);
  const marginRate = getSetting("targetMargin", 0.20);
  const taxRate = getSetting("taxRate", 0.10);
  const regionBPercent = getSetting("regionBZonePercent", 0.15);
  const regionCPercent = getSetting("regionCZonePercent", 0.25);

  // Direct cost calculation (PROMPT 3)
  const directCost = mc + lc + tc;
  const fixedCostAlloc = directCost * fcaRate;
  const totalCost = directCost + fixedCostAlloc;
  
  const basePrice = marginRate < 1 ? totalCost / (1 - marginRate) : totalCost * (1 + marginRate);
  const marginAmount = basePrice - totalCost;
  
  // Regional adjustment (PROMPT 4)
  let regionalAdjustment = 0;
  if (regionZone === "B") regionalAdjustment = basePrice * regionBPercent;
  else if (regionZone === "C") regionalAdjustment = basePrice * regionCPercent;
  
  const priceWithRegion = basePrice + regionalAdjustment;
  const taxAmount = priceWithRegion * taxRate;
  const finalPrice = priceWithRegion + taxAmount;

  const results = {
    directCost,
    fixedCostAlloc,
    totalCost,
    marginAmount,
    basePrice,
    regionalAdjustment,
    priceWithRegion,
    taxAmount,
    finalPrice,
    pricePerSqm: m > 0 ? finalPrice / m : 0
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
          <Calculator className="w-8 h-8 text-primary" />
          Calculadora de Preços
        </h1>
        <p className="text-slate-500 mt-1">Calcule preços precisos para suas obras com base em custos, margens e configurações.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <Card>
          <div className="p-6 border-b border-border/50 bg-slate-50/50">
            <h3 className="text-xl font-bold font-display text-slate-800">Dados da Obra</h3>
          </div>
          <CardContent className="space-y-6 pt-6">
            <Input 
              label="Total de Metros Quadrados (m²)" 
              type="number" 
              value={sqMeters} 
              onChange={e => setSqMeters(e.target.value)} 
              className="text-xl font-bold"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Custo Total de Materiais (R$)" 
                type="number" 
                value={matCost} 
                onChange={e => setMatCost(e.target.value)} 
              />
              <Input 
                label="Custo Total de Mão de Obra (R$)" 
                type="number" 
                value={labCost} 
                onChange={e => setLabCost(e.target.value)} 
              />
            </div>

            <Input 
              label="Custo de Transporte (R$)" 
              type="number" 
              value={transCost} 
              onChange={e => setTransCost(e.target.value)} 
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Zona Regional</label>
              <select 
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-border focus:outline-none focus:border-primary transition-all font-medium"
                value={regionZone}
                onChange={e => setRegionZone(e.target.value)}
              >
                <option value="A">Zona A - Local (sem ajuste)</option>
                <option value="B">Zona B - Até 50km ({(regionBPercent * 100).toFixed(1)}% adicional)</option>
                <option value="C">Zona C - Acima de 100km ({(regionCPercent * 100).toFixed(1)}% adicional)</option>
              </select>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
              <PieChart className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-bold mb-1">Usando Padrões do Sistema:</p>
                <ul className="list-disc pl-4 space-y-0.5 opacity-80">
                  <li>Alocação de Custos Fixos: {(getSetting("fixedCostAllocation", 0.15) * 100).toFixed(1)}%</li>
                  <li>Margem Alvo: {(getSetting("targetMargin", 0.20) * 100).toFixed(1)}%</li>
                  <li>Taxa de Imposto: {(getSetting("taxRate", 0.10) * 100).toFixed(1)}%</li>
                  <li>Ajuste Zona B: {(getSetting("regionBZonePercent", 0.15) * 100).toFixed(1)}%</li>
                  <li>Ajuste Zona C: {(getSetting("regionCZonePercent", 0.25) * 100).toFixed(1)}%</li>
                </ul>
                <a href="/settings" className="underline font-semibold mt-2 inline-block">Editar Regras</a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          <Card className="bg-slate-900 text-white overflow-hidden border-none shadow-2xl relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <DollarSign className="w-32 h-32" />
            </div>
            <div className="p-6 relative z-10">
              <h3 className="text-xl font-bold text-slate-300 font-display mb-8">Preço Sugerido</h3>
              
              <div className="mb-8">
                <p className="text-sm font-medium text-slate-400 mb-1">Preço Final Total (inc. Impostos)</p>
                <div className="text-5xl font-bold font-display text-emerald-400">
                  R$ {results?.finalPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">Preço por m²</p>
                  <div className="text-2xl font-bold">
                    R$ {results?.pricePerSqm.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">Lucro Projetado</p>
                  <div className="text-2xl font-bold text-blue-400">
                    R$ {results?.marginAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h4 className="font-bold text-slate-900 mb-4 font-display">Detalhamento de Custos</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Custos Diretos (Mat + MO)</span>
                  <span className="font-semibold text-slate-900">R$ {results?.directCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Alocação de Custos Fixos</span>
                  <span className="font-semibold text-slate-900">R$ {results?.fixedCostAlloc.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 bg-slate-50 -mx-6 px-6 font-bold">
                  <span className="text-slate-800">Custo Base Total</span>
                  <span className="text-slate-900">R$ {results?.totalCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Margem Alvo</span>
                  <span className="font-semibold text-emerald-600">+ R$ {results?.marginAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                {results.regionalAdjustment > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Ajuste Regional</span>
                    <span className="font-semibold text-blue-600">+ R$ {results?.regionalAdjustment.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Impostos</span>
                  <span className="font-semibold text-red-500">+ R$ {results?.taxAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
