import type { ChangeEvent } from "react";
import { AlertTriangle, BarChart2, Briefcase, CheckCircle, Clock, Package, Play, Plus } from "lucide-react";

import type { ServiceProgress, WorkOrderMaterialReconciliationResponse } from "@/features/work-orders/types";
import { WorkOrderFinalizationPanel } from "@/features/work-orders/components/WorkOrderFinalizationPanel";
import { WorkOrderMaterialConsumption } from "@/features/work-orders/components/WorkOrderMaterialConsumption";
import { WorkOrderMaterialReconciliation } from "@/features/work-orders/components/WorkOrderMaterialReconciliation";
import { WorkOrderPhotosSection } from "@/features/work-orders/components/WorkOrderPhotosSection";

type ChecklistItem = { key: string; label: string };
type ExceededMaterial = { name: string; planned: number; real: number; service: string };

type WorkOrderProgressSectionProps = {
  detailWO: any;
  serviceProgress: ServiceProgress[];
  allExceeded: ExceededMaterial[];
  currentUsername?: string;
  selectedConsumoSvcIdx: number;
  consumoInputs: Record<number, string>;
  consumoNotes: string;
  savingConsumo: boolean;
  consumoLogs: any[];
  pendingMaterials: any[];
  materialReconciliation?: WorkOrderMaterialReconciliationResponse | null;
  isLoadingMaterialReconciliation?: boolean;
  ignorePendingMaterials: boolean;
  allPhotos: any[];
  obraObservations: string;
  checklistItems: readonly ChecklistItem[];
  checklistDone: Record<string, boolean>;
  warrantyCreated: any;
  postSaleCreated: any;
  savingObra: boolean;
  finalizando: boolean;
  onResetFromJob: () => void;
  onUpdateService: (index: number, field: keyof ServiceProgress, value: any) => void;
  onUpdateRealMaterial: (serviceIndex: number, materialIndex: number, value: number) => void;
  onAddService: () => void;
  onSelectConsumoService: (index: number) => void;
  onConsumoInputChange: (index: number, value: string) => void;
  onConsumoNotesChange: (value: string) => void;
  onRegistrarConsumo: () => void;
  onDeleteConsumo: (id: number) => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>, category: string) => void;
  onObraObservationsChange: (value: string) => void;
  onChecklistChange: (key: string, checked: boolean) => void;
  onSave: () => void;
  onFinalize: () => void;
  onGenerateReport: () => void;
};

function ServiceStatusBadge({ service }: { service: ServiceProgress }) {
  if (service.finished) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700"><CheckCircle className="h-3 w-3" /> Concluído</span>;
  }
  if (service.started) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700"><Clock className="h-3 w-3" /> Em andamento</span>;
  }
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-400">Não iniciado</span>;
}

export function WorkOrderProgressSection({
  detailWO,
  serviceProgress,
  allExceeded,
  currentUsername,
  selectedConsumoSvcIdx,
  consumoInputs,
  consumoNotes,
  savingConsumo,
  consumoLogs,
  pendingMaterials,
  materialReconciliation,
  isLoadingMaterialReconciliation,
  ignorePendingMaterials,
  allPhotos,
  obraObservations,
  checklistItems,
  checklistDone,
  warrantyCreated,
  postSaleCreated,
  savingObra,
  finalizando,
  onResetFromJob,
  onUpdateService,
  onUpdateRealMaterial,
  onAddService,
  onSelectConsumoService,
  onConsumoInputChange,
  onConsumoNotesChange,
  onRegistrarConsumo,
  onDeleteConsumo,
  onFileUpload,
  onObraObservationsChange,
  onChecklistChange,
  onSave,
  onFinalize,
  onGenerateReport,
}: WorkOrderProgressSectionProps) {

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-slate-800">Obras / Serviços a serem feitos</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{serviceProgress.length} serviço(s)</span>
          </div>
          {detailWO?.jobId && (
            <button type="button" onClick={onResetFromJob} className="text-left text-xs font-semibold text-primary hover:underline" title="Reinicializar serviços a partir do orçamento original">
              Reiniciar do orçamento
            </button>
          )}
        </div>

        <div className="space-y-2 sm:hidden">
          {serviceProgress.map((service, index) => (
            <div key={`${service.serviceName}-${index}`} className={`rounded-xl border p-3 ${service.finished ? "border-emerald-200 bg-emerald-50" : service.started ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-800">{service.serviceName}</p>
                <ServiceStatusBadge service={service} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {!service.started && !service.finished && (
                  <button type="button" onClick={() => { onUpdateService(index, "started", true); if (!service.startDate) onUpdateService(index, "startDate", new Date().toISOString().split("T")[0]); }} className="min-h-10 rounded-lg bg-amber-100 px-3 text-xs font-bold text-amber-700" data-testid={`button-start-service-${index}`}>
                    Iniciar
                  </button>
                )}
                {service.started && !service.finished && (
                  <button type="button" onClick={() => { onUpdateService(index, "finished", true); if (!service.endDate) onUpdateService(index, "endDate", new Date().toISOString().split("T")[0]); }} className="min-h-10 rounded-lg bg-emerald-100 px-3 text-xs font-bold text-emerald-700" data-testid={`button-finish-service-${index}`}>
                    Finalizar
                  </button>
                )}
                {service.finished && (
                  <button type="button" onClick={() => { onUpdateService(index, "finished", false); onUpdateService(index, "started", true); }} className="min-h-10 rounded-lg bg-white px-3 text-xs font-bold text-amber-700">
                    Reabrir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-slate-200 sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-2.5 text-left">Serviço</th>
                <th className="w-32 px-4 py-2.5 text-center">Status</th>
                <th className="w-40 px-4 py-2.5 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {serviceProgress.map((service, index) => (
                <tr key={`${service.serviceName}-${index}`} className={service.finished ? "bg-emerald-50" : service.started ? "bg-amber-50/60" : ""}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{service.serviceName}</td>
                  <td className="px-4 py-2.5 text-center"><ServiceStatusBadge service={service} /></td>
                  <td className="px-4 py-2.5 text-center">
                    {!service.started && !service.finished && (
                      <button type="button" onClick={() => { onUpdateService(index, "started", true); if (!service.startDate) onUpdateService(index, "startDate", new Date().toISOString().split("T")[0]); }} className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-200" data-testid={`button-start-service-${index}`}>
                        <Play className="h-3 w-3" /> Iniciar
                      </button>
                    )}
                    {service.started && !service.finished && (
                      <button type="button" onClick={() => { onUpdateService(index, "finished", true); if (!service.endDate) onUpdateService(index, "endDate", new Date().toISOString().split("T")[0]); }} className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-200" data-testid={`button-finish-service-${index}`}>
                        <CheckCircle className="h-3 w-3" /> Finalizar
                      </button>
                    )}
                    {service.finished && (
                      <button type="button" onClick={() => { onUpdateService(index, "finished", false); onUpdateService(index, "started", true); }} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600">
                        Reabrir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {allExceeded.length > 0 && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="font-bold text-red-800">Material(is) excedido(s)!</p>
              <ul className="mt-1 space-y-0.5">
                {allExceeded.map((item, index) => (
                  <li key={index} className="text-sm text-red-700"><strong>{item.name}</strong> ({item.service}): planejado {item.planned} un., usado {item.real} un. (+{item.real - item.planned})</li>
                ))}
              </ul>
              <p className="mt-2 text-xs font-medium text-red-600">Considere gerar um orçamento complementar para cobrir o excedente.</p>
            </div>
          </div>
        </section>
      )}

      <WorkOrderMaterialReconciliation
        reconciliation={materialReconciliation}
        isLoading={isLoadingMaterialReconciliation}
      />

      <WorkOrderMaterialConsumption
        serviceProgress={serviceProgress}
        currentUsername={currentUsername}
        selectedServiceIndex={selectedConsumoSvcIdx}
        consumoInputs={consumoInputs}
        consumoNotes={consumoNotes}
        savingConsumo={savingConsumo}
        consumoLogs={consumoLogs}
        onSelectService={onSelectConsumoService}
        onInputChange={onConsumoInputChange}
        onNotesChange={onConsumoNotesChange}
        onRegistrarConsumo={onRegistrarConsumo}
        onDeleteConsumo={onDeleteConsumo}
      />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-slate-800">Registro por Serviço</h3>
        </div>

        {serviceProgress.map((service, serviceIndex) => (
          <div key={`${service.serviceName}-${serviceIndex}`} className="overflow-hidden rounded-xl border border-slate-200">
            <div className={`flex items-center justify-between px-4 py-2.5 ${service.finished ? "border-b border-emerald-200 bg-emerald-50" : service.started ? "border-b border-amber-100 bg-amber-50" : "border-b border-slate-200 bg-slate-50"}`}>
              <span className="text-sm font-semibold text-slate-800">{service.serviceName}</span>
              <ServiceStatusBadge service={service} />
            </div>
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Data de Início</label>
                  <input type="date" value={service.startDate || ""} onChange={event => { onUpdateService(serviceIndex, "startDate", event.target.value); if (!service.started) onUpdateService(serviceIndex, "started", true); }} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none" data-testid={`input-start-date-${serviceIndex}`} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Data de Término</label>
                  <input type="date" value={service.endDate || ""} onChange={event => { onUpdateService(serviceIndex, "endDate", event.target.value); if (!service.finished) { onUpdateService(serviceIndex, "finished", true); onUpdateService(serviceIndex, "started", true); } }} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none" data-testid={`input-end-date-${serviceIndex}`} />
                </div>
              </div>

              {service.realMaterials.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Package className="h-3.5 w-3.5" /> Consumo de Materiais - Planejado x Real</p>
                  <div className="space-y-1.5">
                    {service.realMaterials.map((material, materialIndex) => {
                      const exceeded = material.realQty > material.plannedQty && material.plannedQty > 0;
                      return (
                        <div key={`${material.name}-${materialIndex}`} className={`grid gap-2 rounded-xl border px-3 py-2 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center ${exceeded ? "border-red-200 bg-red-50" : "border-slate-100 bg-slate-50"}`} data-testid={`mat-row-${serviceIndex}-${materialIndex}`}>
                          <span className="truncate font-medium text-slate-700">{material.name}</span>
                          <span className="text-slate-500 sm:w-20 sm:text-right">Planejado: {material.plannedQty} un.</span>
                          <input type="number" min="0" step="1" value={material.realQty || ""} onChange={event => onUpdateRealMaterial(serviceIndex, materialIndex, Number(event.target.value))} placeholder="0" className={`min-h-10 rounded-lg border px-2 text-center text-sm font-bold transition-all focus:border-primary focus:outline-none sm:w-24 ${exceeded ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-800"}`} data-testid={`input-real-mat-${serviceIndex}-${materialIndex}`} />
                          {exceeded ? <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" /> : material.realQty > 0 ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" /> : <span className="h-4 w-4" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Observações do Serviço</label>
                <textarea value={service.observations || ""} onChange={event => onUpdateService(serviceIndex, "observations", event.target.value)} rows={2} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none" placeholder="Registro do executor, dificuldades, ajustes..." data-testid={`input-observations-${serviceIndex}`} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <button type="button" onClick={onAddService} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 transition-colors hover:border-primary hover:text-primary" data-testid="button-add-service-progress">
        <Plus className="h-4 w-4" /> Adicionar Serviço ao Registro
      </button>

      <WorkOrderPhotosSection
        allPhotos={allPhotos}
        obraObservations={obraObservations}
        onFileUpload={onFileUpload}
        onObraObservationsChange={onObraObservationsChange}
      />

      <WorkOrderFinalizationPanel
        detailWO={detailWO}
        serviceProgress={serviceProgress}
        checklistItems={checklistItems}
        checklistDone={checklistDone}
        warrantyCreated={warrantyCreated}
        postSaleCreated={postSaleCreated}
        pendingMaterials={pendingMaterials}
        ignorePendingMaterials={ignorePendingMaterials}
        savingObra={savingObra}
        finalizando={finalizando}
        onChecklistChange={onChecklistChange}
        onSave={onSave}
        onFinalize={onFinalize}
        onGenerateReport={onGenerateReport}
      />
    </div>
  );
}
