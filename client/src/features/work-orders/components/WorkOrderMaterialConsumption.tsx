import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, History, UserCheck, X } from "lucide-react";

import { Button } from "@/components/Button";
import type { ServiceProgress } from "@/features/work-orders/types";

type WorkOrderMaterialConsumptionProps = {
  serviceProgress: ServiceProgress[];
  currentUsername?: string;
  selectedServiceIndex: number;
  consumoInputs: Record<number, string>;
  consumoNotes: string;
  savingConsumo: boolean;
  consumoLogs: any[];
  onSelectService: (index: number) => void;
  onInputChange: (index: number, value: string) => void;
  onNotesChange: (value: string) => void;
  onRegistrarConsumo: () => void;
  onDeleteConsumo: (id: number) => void;
};

export function WorkOrderMaterialConsumption({
  serviceProgress,
  currentUsername,
  selectedServiceIndex,
  consumoInputs,
  consumoNotes,
  savingConsumo,
  consumoLogs,
  onSelectService,
  onInputChange,
  onNotesChange,
  onRegistrarConsumo,
  onDeleteConsumo,
}: WorkOrderMaterialConsumptionProps) {
  const selectedService = serviceProgress[selectedServiceIndex];

  return (
    <section className="space-y-4">
      <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-slate-800">Consumo de materiais</h3>
          </div>
          <span className="text-xs text-slate-500">Registrando como: <strong className="text-primary">{currentUsername}</strong></span>
        </div>

        {serviceProgress.length > 0 ? (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {serviceProgress.map((service, index) => (
                <button key={`${service.serviceName}-${index}`} type="button" onClick={() => onSelectService(index)} data-testid={`pill-service-${index}`} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${selectedServiceIndex === index ? "bg-primary text-white shadow" : "border border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"}`}>
                  {service.serviceName}
                </button>
              ))}
            </div>

            {selectedService?.realMaterials.length > 0 ? (
              <div className="space-y-2">
                {selectedService.realMaterials.map((material, index) => (
                  <div key={`${material.name}-${index}`} className="grid gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 sm:grid-cols-[1fr_auto_90px_auto] sm:items-center">
                    <span className="truncate text-sm font-medium text-slate-700">{material.name}</span>
                    <span className="text-xs text-slate-400">Planejado: {material.plannedQty} un.</span>
                    <input type="number" min="1" step="1" value={consumoInputs[index] || ""} onChange={event => onInputChange(index, event.target.value)} placeholder="0" data-testid={`input-consumo-mat-${index}`} className="min-h-10 rounded-lg border border-slate-200 px-2 text-center text-sm font-bold focus:border-primary focus:outline-none" />
                    <span className="text-xs text-slate-400">un.</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-slate-400">Nenhum material associado a este serviço.</p>
            )}

            <input type="text" value={consumoNotes} onChange={event => onNotesChange(event.target.value)} placeholder="Observações (opcional)" data-testid="input-consumo-notes" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            <Button type="button" onClick={onRegistrarConsumo} isLoading={savingConsumo} size="sm" className="min-h-11 w-full" data-testid="button-registrar-consumo">
              <ClipboardList className="mr-2 h-4 w-4" /> Registrar Consumo
            </Button>
          </>
        ) : (
          <p className="text-sm italic text-slate-400">Nenhum serviço no progresso. Adicione serviços abaixo.</p>
        )}
      </div>

      {consumoLogs.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-slate-800">Histórico de lançamentos ({consumoLogs.length})</h3>
          </div>

          <div className="space-y-2 sm:hidden">
            {consumoLogs.map(log => (
              <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-primary">{log.username}</p>
                    <p className="text-sm font-bold text-slate-800">{log.materialName}</p>
                    <p className="text-xs text-slate-500">{log.serviceName} · {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: ptBR })}</p>
                  </div>
                  <button type="button" onClick={() => onDeleteConsumo(log.id)} data-testid={`button-delete-consumo-${log.id}`} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                </div>
                <p className="mt-2 text-sm font-bold text-slate-800">Qtd: {log.quantity}</p>
                {log.notes && <p className="mt-1 text-xs text-slate-500">{log.notes}</p>}
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-slate-200 sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <th className="px-3 py-2 text-left">Data/Hora</th>
                  <th className="px-3 py-2 text-left">Usuário</th>
                  <th className="px-3 py-2 text-left">Serviço</th>
                  <th className="px-3 py-2 text-left">Material</th>
                  <th className="w-16 px-3 py-2 text-center">Qtd</th>
                  <th className="px-3 py-2 text-left">Obs.</th>
                  <th className="w-10 px-3 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {consumoLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{format(new Date(log.createdAt), "dd/MM HH:mm", { locale: ptBR })}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-primary">{log.username}</td>
                    <td className="max-w-[90px] truncate px-3 py-2 text-xs text-slate-600">{log.serviceName}</td>
                    <td className="max-w-[110px] truncate px-3 py-2 text-xs text-slate-700">{log.materialName}</td>
                    <td className="px-3 py-2 text-center font-bold text-slate-800">{log.quantity}</td>
                    <td className="max-w-[80px] truncate px-3 py-2 text-xs text-slate-400">{log.notes || "-"}</td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" onClick={() => onDeleteConsumo(log.id)} data-testid={`button-delete-consumo-${log.id}`} className="text-red-400 transition-colors hover:text-red-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}
