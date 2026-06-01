import React from "react";
import { Card, CardContent } from "@/components/Card";

interface ScoreBreakdownProps {
  serviceTypeScore: number;
  sizeScore: number;
  distanceScore: number;
  returnScore: number;
  totalScore: number;
}

export function ScoreBreakdown({
  serviceTypeScore,
  sizeScore,
  distanceScore,
  returnScore,
  totalScore,
}: ScoreBreakdownProps) {
  const items = [
    { label: "Tipo de Serviço", value: serviceTypeScore },
    { label: "Tamanho", value: sizeScore },
    { label: "Distância", value: distanceScore },
    { label: "Retorno", value: returnScore },
  ];

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-slate-900 text-sm">Detalhamento da Pontuação</h3>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex justify-between items-center text-sm">
              <span className="text-slate-700">{item.label}</span>
              <span className="font-semibold text-slate-900">+{item.value.toFixed(1)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-300 pt-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-900">Total</span>
            <span className="text-lg font-bold text-primary">{totalScore.toFixed(1)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
