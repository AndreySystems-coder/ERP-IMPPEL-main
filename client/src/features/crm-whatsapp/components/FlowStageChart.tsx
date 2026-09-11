import { BarChart3 } from "lucide-react";

import { asArray } from "@/lib/safeData";
import { Bar, BarChart, chartCssVars, ChartTooltip, Grid } from "@/components/ui/bar-chart";
import type { Lead, WhatsappFlow } from "@shared/schema";

export const SEM_FLUXO_TRIGGER = "__sem_fluxo__";

type FlowStageChartProps = {
  leads: Lead[];
  flows: WhatsappFlow[];
  isLoading?: boolean;
  onSelectFlow: (trigger: string, label: string) => void;
};

// Substitui a antiga "Lista principal" (cards soltos) por um gráfico de barras: uma barra por
// fluxo com a contagem de leads ali dentro, clicável — leva pra uma lista completa daquele
// fluxo sem o corte de "+N mais" que o quadro Kanban aplica quando passa de poucos cards.
// Os nomes dos fluxos só aparecem no tooltip ao passar o mouse — com muitos fluxos ativos,
// rótulo fixo embaixo de cada barra ficava espremido e ilegível.
export function FlowStageChart({ leads, flows, isLoading = false, onSelectFlow }: FlowStageChartProps) {
  const leadsList = asArray<Lead>(leads);
  const activeFlows = asArray<WhatsappFlow>(flows)
    .filter(flow => flow.active)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const bars = [
    { trigger: SEM_FLUXO_TRIGGER, name: "Sem fluxo", count: leadsList.filter(lead => !lead.currentFlowTrigger).length },
    ...activeFlows.map(flow => ({
      trigger: flow.trigger,
      name: flow.name,
      count: leadsList.filter(lead => lead.currentFlowTrigger === flow.trigger).length,
    })),
  ];

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <BarChart3 className="h-4 w-4" />
            Leads por fluxo
          </h2>
          <p className="text-sm text-slate-500">Passe o mouse numa barra pra ver o nome do fluxo, clique pra ver a lista completa.</p>
        </div>
        <span className="text-xs font-semibold text-slate-400">{leadsList.length} lead(s) no total</span>
      </div>

      <BarChart
        data={bars}
        xDataKey="name"
        aspectRatio="3.4 / 1"
        margin={{ top: 24, right: 16, bottom: 16, left: 16 }}
        barGap={0.35}
        onBarClick={(item) => onSelectFlow(item.trigger as string, item.name as string)}
        yScaleType="sqrt"
      >
        <Grid horizontal fadeHorizontal={false} />
        <Bar dataKey="count" fill={chartCssVars.linePrimary} lineCap="round" minBarSize={6} />
        <ChartTooltip
          showCrosshair={false}
          showDots={false}
          rows={(point) => [
            { color: point.trigger === SEM_FLUXO_TRIGGER ? chartCssVars.foregroundMuted : chartCssVars.linePrimary, label: "Leads", value: point.count as number },
          ]}
        />
      </BarChart>
    </section>
  );
}
