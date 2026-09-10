import { BarChart3 } from "lucide-react";

import { asArray } from "@/lib/safeData";
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
export function FlowStageChart({ leads, flows, isLoading = false, onSelectFlow }: FlowStageChartProps) {
  const leadsList = asArray<Lead>(leads);
  const activeFlows = asArray<WhatsappFlow>(flows)
    .filter(flow => flow.active)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const bars = [
    { trigger: SEM_FLUXO_TRIGGER, label: "Sem fluxo", count: leadsList.filter(lead => !lead.currentFlowTrigger).length },
    ...activeFlows.map(flow => ({
      trigger: flow.trigger,
      label: flow.name,
      count: leadsList.filter(lead => lead.currentFlowTrigger === flow.trigger).length,
    })),
  ];

  const rawMax = Math.max(1, ...bars.map(bar => bar.count));
  // Eixo cresce do zero até um número redondo acima do maior valor real (não fixo em 100) —
  // assim uma pipeline pequena não fica com barras minúsculas perdidas num eixo gigante.
  const axisMax = Math.max(5, Math.ceil(rawMax / 5) * 5);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(fraction => Math.round(axisMax * fraction));

  const width = 900;
  const height = 260;
  const padding = { top: 16, right: 16, bottom: 46, left: 34 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const barGap = 14;
  const barWidth = bars.length > 0 ? Math.min(64, (plotWidth - barGap * (bars.length - 1)) / bars.length) : 0;
  const trackWidth = barWidth + barGap;

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
          <p className="text-sm text-slate-500">Clique numa barra pra ver a lista completa daquele fluxo, sem corte.</p>
        </div>
        <span className="text-xs font-semibold text-slate-400">{leadsList.length} lead(s) no total</span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Gráfico de barras mostrando quantos leads estão em cada fluxo: ${bars.map(b => `${b.label} ${b.count}`).join(", ")}.`}
          className="w-full min-w-[640px] text-slate-400 dark:text-slate-600"
        >
          {/* linhas guia + rótulos do eixo esquerdo */}
          {ticks.map(tick => {
            const y = padding.top + plotHeight - (tick / axisMax) * plotHeight;
            return (
              <g key={tick}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" strokeOpacity={0.15} />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="currentColor">{tick}</text>
              </g>
            );
          })}
          <line x1={padding.left} y1={padding.top + plotHeight} x2={width - padding.right} y2={padding.top + plotHeight} stroke="currentColor" strokeOpacity={0.35} />

          {bars.map((bar, index) => {
            const barHeight = (bar.count / axisMax) * plotHeight;
            const x = padding.left + index * trackWidth + (trackWidth - barWidth - barGap) / 2 + barGap / 2;
            const y = padding.top + plotHeight - barHeight;
            const isEmpty = bar.trigger === SEM_FLUXO_TRIGGER;
            return (
              <g
                key={bar.trigger}
                className="cursor-pointer"
                onClick={() => onSelectFlow(bar.trigger, bar.label)}
                tabIndex={0}
                role="button"
                aria-label={`Ver todos os leads em ${bar.label} (${bar.count})`}
                onKeyDown={event => { if (event.key === "Enter" || event.key === " ") onSelectFlow(bar.trigger, bar.label); }}
              >
                <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 2)} rx={4}
                  fill={isEmpty ? "currentColor" : "#16a34a"} fillOpacity={isEmpty ? 0.35 : 0.85} />
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="12" fontWeight={700} fill="currentColor" className="text-slate-700 dark:text-slate-200">
                  {bar.count}
                </text>
                <text x={x + barWidth / 2} y={padding.top + plotHeight + 16} textAnchor="middle" fontSize="10.5" fill="currentColor">
                  <title>{bar.label}</title>
                  {bar.label.length > 12 ? `${bar.label.slice(0, 11)}…` : bar.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
