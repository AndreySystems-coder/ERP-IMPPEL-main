import { AlertTriangle, CheckCircle2, ClipboardCheck, PackageCheck, Route } from "lucide-react";

import type { WorkOrderMaterialReconciliationResponse } from "@/features/work-orders/types";

type WorkOrderMaterialReconciliationProps = {
  reconciliation?: WorkOrderMaterialReconciliationResponse | null;
  isLoading?: boolean;
};

const statusConfig = {
  ok: { label: "OK", className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  pending: { label: "Pendente", className: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  exceeded: { label: "Excedido", className: "bg-red-100 text-red-700", icon: AlertTriangle },
  direct: { label: "Direto", className: "bg-blue-100 text-blue-700", icon: Route },
};

function QuantityCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <p className="text-[11px] font-semibold uppercase text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

export function WorkOrderMaterialReconciliation({ reconciliation, isLoading }: WorkOrderMaterialReconciliationProps) {
  const items = reconciliation?.items || [];

  if (isLoading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map(index => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <PackageCheck className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h3 className="font-bold text-slate-800">Reconciliação de materiais da OS</h3>
            <p className="text-xs text-slate-500">Planejado, retirado, consumido, devolvido e pendente em uma única visão.</p>
          </div>
        </div>
        {reconciliation?.hasDirectConsumption && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
            <Route className="h-3.5 w-3.5" /> Consumo direto
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Nenhum material planejado, retirado ou consumido nesta OS.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <QuantityCell label="Planejado" value={reconciliation?.summary.planned || 0} />
            <QuantityCell label="Retirado" value={reconciliation?.summary.withdrawn || 0} />
            <QuantityCell label="Consumido" value={reconciliation?.summary.consumed || 0} />
            <QuantityCell label="Devolvido" value={reconciliation?.summary.returned || 0} />
            <QuantityCell label="Pendente" value={reconciliation?.summary.pending || 0} />
          </div>

          <div className="space-y-2 sm:hidden">
            {items.map(item => {
              const StatusIcon = statusConfig[item.status].icon;
              return (
                <article key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      {item.directConsumed > 0 && <p className="mt-0.5 text-xs text-blue-600">Consumo direto: {item.directConsumed}</p>}
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${statusConfig[item.status].className}`}>
                      <StatusIcon className="h-3 w-3" /> {statusConfig[item.status].label}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-1 text-center text-xs">
                    <QuantityCell label="Plan." value={item.planned} />
                    <QuantityCell label="Ret." value={item.withdrawn} />
                    <QuantityCell label="Cons." value={item.consumed} />
                    <QuantityCell label="Dev." value={item.returned} />
                    <QuantityCell label="Pend." value={item.pending} />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-slate-200 sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <th className="px-3 py-2 text-left">Material</th>
                  <th className="px-3 py-2 text-center">Planejado</th>
                  <th className="px-3 py-2 text-center">Retirado</th>
                  <th className="px-3 py-2 text-center">Consumido</th>
                  <th className="px-3 py-2 text-center">Devolvido</th>
                  <th className="px-3 py-2 text-center">Pendente</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => {
                  const StatusIcon = statusConfig[item.status].icon;
                  return (
                    <tr key={item.key} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {item.name}
                        {item.directConsumed > 0 && <span className="ml-2 text-xs font-semibold text-blue-600">direto {item.directConsumed}</span>}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">{item.planned}</td>
                      <td className="px-3 py-2 text-center font-semibold">{item.withdrawn}</td>
                      <td className="px-3 py-2 text-center font-semibold">{item.consumed}</td>
                      <td className="px-3 py-2 text-center font-semibold">{item.returned}</td>
                      <td className="px-3 py-2 text-center font-semibold">{item.pending}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${statusConfig[item.status].className}`}>
                          <StatusIcon className="h-3 w-3" /> {statusConfig[item.status].label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {reconciliation?.hasPending && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Existem materiais retirados que ainda nao foram consumidos ou devolvidos. Confira antes de finalizar a OS.
            </div>
          )}
        </>
      )}
    </section>
  );
}
