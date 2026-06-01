import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SiWhatsapp } from "react-icons/si";
import { Briefcase, ChevronDown, ChevronRight, ClipboardList, Edit2, Package, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import type { ServiceProgress, WorkOrderMaterial } from "@/features/work-orders/types";
import { getDisplayUnit, parseMaterialsNeeded } from "@/features/work-orders/utils";

type WorkOrderListProps = {
  workOrders: any[];
  isLoading?: boolean;
  search: string;
  statusColors: Record<string, string>;
  onSearchChange: (value: string) => void;
  onWhatsApp: (workOrder: any) => void;
  onDetail: (workOrder: any) => void;
  onEdit: (workOrder: any) => void;
  onDelete: (workOrder: any) => void;
};

function parseProgress(serviceProgress?: string | null): { done: number; total: number } | null {
  if (!serviceProgress) return null;

  try {
    const parsed: ServiceProgress[] = JSON.parse(serviceProgress);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return { done: parsed.filter(service => service.finished).length, total: parsed.length };
  } catch {
    return null;
  }
}

function MaterialsPanel({ materialsNeeded }: { materialsNeeded?: string | null }) {
  const [open, setOpen] = useState(false);
  const materials: WorkOrderMaterial[] = parseMaterialsNeeded(materialsNeeded);

  if (materials.length === 0) return <span className="text-xs text-slate-400">-</span>;

  return (
    <div>
      <button type="button" onClick={() => setOpen(value => !value)} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-200">
        <Package className="h-3 w-3" /> {materials.length} material(is)
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {materials.map((material, index) => (
            <div key={`${material.name}-${index}`} className="flex justify-between gap-3 rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
              <span className="truncate">{material.name}</span>
              <span className="ml-2 shrink-0 font-semibold">{Math.ceil(material.quantity)} {getDisplayUnit(material)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkOrderActions({ workOrder, onWhatsApp, onDetail, onEdit, onDelete }: Pick<WorkOrderListProps, "onWhatsApp" | "onDetail" | "onEdit" | "onDelete"> & { workOrder: any }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={() => onWhatsApp(workOrder)} className="text-green-600 hover:bg-green-50" title="Enviar atualização via WhatsApp" data-testid={`button-whatsapp-wo-${workOrder.id}`}>
        <SiWhatsapp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onDetail(workOrder)} data-testid={`button-detail-wo-${workOrder.id}`} title="Registro de Obra">
        <ClipboardList className="h-4 w-4 text-slate-500" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onEdit(workOrder)} data-testid={`button-edit-wo-${workOrder.id}`}>
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => onDelete(workOrder)} data-testid={`button-delete-wo-${workOrder.id}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function WorkOrderList({ workOrders, isLoading = false, search, statusColors, onSearchChange, onWhatsApp, onDetail, onEdit, onDelete }: WorkOrderListProps) {
  const emptyMessage = search.trim() ? "Nenhuma OS encontrada para esta busca" : "Nenhuma ordem de serviço";

  return (
    <section className="space-y-4">
      <div className="flex items-center rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-primary">
        <Search className="mr-3 h-5 w-5 shrink-0 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar por cliente ou serviço..."
          className="w-full border-none bg-transparent text-slate-900 outline-none"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-3 sm:hidden">
        {isLoading && (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-14 animate-pulse rounded-lg bg-slate-100" />
                <div className="h-14 animate-pulse rounded-lg bg-slate-100" />
              </div>
            </div>
          </Card>
        )}

        {!isLoading && workOrders.length === 0 && (
          <Card className="p-8 text-center text-slate-400">
            <Briefcase className="mx-auto mb-3 h-12 w-12 opacity-40" />
            <p className="font-medium">{emptyMessage}</p>
          </Card>
        )}

        {!isLoading && workOrders.map(workOrder => {
          const progress = parseProgress(workOrder.serviceProgress);

          return (
            <Card key={workOrder.id} className="p-4" data-testid={`card-wo-${workOrder.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">OS #{workOrder.id}</p>
                  <h3 className="truncate text-base font-bold text-slate-900">{workOrder.clientName}</h3>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{workOrder.serviceType}</p>
                </div>
                <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${statusColors[workOrder.status] || "bg-slate-100 text-slate-600"}`}>{workOrder.status}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-400">Data</p>
                  <p className="font-semibold text-slate-800">{workOrder.scheduledDate ? format(new Date(workOrder.scheduledDate), "dd/MM/yyyy", { locale: ptBR }) : "-"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-400">Progresso</p>
                  <p className="font-semibold text-slate-800">{progress ? `${progress.done}/${progress.total} concl.` : "Sem registro"}</p>
                </div>
              </div>

              <div className="mt-3">
                <MaterialsPanel materialsNeeded={workOrder.materialsNeeded} />
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <WorkOrderActions workOrder={workOrder} onWhatsApp={onWhatsApp} onDetail={onDetail} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="hidden overflow-hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-slate-50 text-sm font-semibold uppercase text-slate-500">
                <th className="p-4 pl-6">Cliente</th>
                <th className="p-4">Serviço</th>
                <th className="p-4">Data</th>
                <th className="p-4">Materiais</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="p-8">
                    <div className="space-y-3">
                      <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
                      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && workOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Briefcase className="mx-auto mb-3 h-12 w-12 opacity-50" />
                    {emptyMessage}
                  </td>
                </tr>
              )}
              {!isLoading && workOrders.map(workOrder => {
                const progress = parseProgress(workOrder.serviceProgress);

                return (
                  <tr key={workOrder.id} className="transition-colors hover:bg-slate-50">
                    <td className="p-4 pl-6 font-bold text-slate-900">{workOrder.clientName}</td>
                    <td className="max-w-[180px] truncate p-4 text-sm">{workOrder.serviceType}</td>
                    <td className="whitespace-nowrap p-4 text-sm">{workOrder.scheduledDate ? format(new Date(workOrder.scheduledDate), "dd/MM/yyyy", { locale: ptBR }) : "-"}</td>
                    <td className="p-4"><MaterialsPanel materialsNeeded={workOrder.materialsNeeded} /></td>
                    <td className="p-4">
                      <span className={`rounded-md px-2.5 py-1 text-sm font-medium ${statusColors[workOrder.status] || "bg-slate-100 text-slate-600"}`}>{workOrder.status}</span>
                      {progress && progress.done > 0 && <span className="ml-2 text-xs text-slate-400">{progress.done}/{progress.total} concl.</span>}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <WorkOrderActions workOrder={workOrder} onWhatsApp={onWhatsApp} onDetail={onDetail} onEdit={onEdit} onDelete={onDelete} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
