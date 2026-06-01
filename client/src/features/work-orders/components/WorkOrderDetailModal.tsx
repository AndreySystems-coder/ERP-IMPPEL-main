import type { ChangeEvent } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, FileDown, Package, X } from "lucide-react";

import { Button } from "@/components/Button";
import type { ServiceProgress, WorkOrderMaterial, WorkOrderMaterialReconciliationResponse } from "@/features/work-orders/types";
import { getDisplayUnit, parseMaterialsNeeded } from "@/features/work-orders/utils";
import { WorkOrderProgressSection } from "@/features/work-orders/components/WorkOrderProgressSection";

type ChecklistItem = { key: string; label: string };

type WorkOrderDetailModalProps = {
  isOpen: boolean;
  workOrder: any;
  activeTab: "info" | "obra";
  statusColors: Record<string, string>;
  serviceProgress: ServiceProgress[];
  allPhotos: any[];
  allExceeded: { name: string; planned: number; real: number; service: string }[];
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
  obraObservations: string;
  checklistItems: readonly ChecklistItem[];
  checklistDone: Record<string, boolean>;
  warrantyCreated: any;
  postSaleCreated: any;
  savingObra: boolean;
  finalizando: boolean;
  onClose: () => void;
  onTabChange: (tab: "info" | "obra") => void;
  onGenerateReport: () => void;
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
};

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  );
}

export function WorkOrderDetailModal({
  isOpen,
  workOrder,
  activeTab,
  statusColors,
  serviceProgress,
  allPhotos,
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
  obraObservations,
  checklistItems,
  checklistDone,
  warrantyCreated,
  postSaleCreated,
  savingObra,
  finalizando,
  onClose,
  onTabChange,
  onGenerateReport,
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
}: WorkOrderDetailModalProps) {
  if (!isOpen || !workOrder) return null;

  const materials: WorkOrderMaterial[] = parseMaterialsNeeded(workOrder.materialsNeeded);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm sm:p-4" data-testid="modal-wo-detail" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[90vh]">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:items-center sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-900 sm:text-xl">OS #{workOrder.id} - {workOrder.clientName}</h2>
            <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{workOrder.serviceType}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {workOrder.status === "Concluída" && (
              <Button variant="outline" onClick={onGenerateReport} className="hidden items-center gap-2 text-sm sm:flex">
                <FileDown className="h-4 w-4" /> Relatório PDF
              </Button>
            )}
            <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-slate-200"><X className="h-5 w-5 text-slate-500" /></button>
          </div>
        </header>

        <nav className="flex overflow-x-auto border-b border-slate-200 px-4 sm:px-6">
          <button onClick={() => onTabChange("info")} className={`min-h-12 whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors ${activeTab === "info" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            Informações
          </button>
          <button onClick={() => onTabChange("obra")} className={`flex min-h-12 items-center gap-1 whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors ${activeTab === "obra" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            <ClipboardList className="h-4 w-4" /> Registro de Obra
            {serviceProgress.some(service => service.started || service.finished) && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
          </button>
        </nav>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "info" && (
            <div className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <InfoItem label="Serviço" value={workOrder.serviceType} />
                <InfoItem label="Status" value={<span className={`inline-block rounded-md px-2.5 py-0.5 text-sm font-medium ${statusColors[workOrder.status] || "bg-slate-100"}`}>{workOrder.status}</span>} />
                <InfoItem label="Data Agendada" value={workOrder.scheduledDate ? format(new Date(workOrder.scheduledDate), "dd/MM/yyyy", { locale: ptBR }) : "-"} />
                <InfoItem label="Endereço" value={workOrder.address || "-"} />
                <InfoItem label="Equipe" value={workOrder.teamAssigned || "-"} />
              </div>

              {workOrder.notes && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Notas</p>
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{workOrder.notes}</p>
                </div>
              )}

              {materials.length > 0 && (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-emerald-800"><Package className="h-4 w-4" /> Materiais Necessários ({materials.length})</h3>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {materials.map((material, index) => (
                      <div key={`${material.name}-${index}`} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-white px-3 py-1.5 text-sm">
                        <span className="truncate pr-2 text-slate-700">{material.name}</span>
                        <span className="whitespace-nowrap font-bold text-emerald-700">{Math.ceil(material.quantity)} {getDisplayUnit(material)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {allPhotos.length > 0 && (
                <section>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Fotos ({allPhotos.length})</p>
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                    {allPhotos.map((photo: any, index: number) => (
                      <div key={`${photo.category}-${index}`} className="relative">
                        <img src={photo.data} alt={photo.category} className="h-24 w-full rounded-lg border object-cover sm:w-24" />
                        <span className="absolute left-0 top-0 rounded-br bg-primary px-1 text-xs capitalize text-white">{photo.category}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === "obra" && (
            <WorkOrderProgressSection
              detailWO={workOrder}
              serviceProgress={serviceProgress}
              allExceeded={allExceeded}
              currentUsername={currentUsername}
              selectedConsumoSvcIdx={selectedConsumoSvcIdx}
              consumoInputs={consumoInputs}
              consumoNotes={consumoNotes}
              savingConsumo={savingConsumo}
              consumoLogs={consumoLogs}
              pendingMaterials={pendingMaterials}
              materialReconciliation={materialReconciliation}
              isLoadingMaterialReconciliation={isLoadingMaterialReconciliation}
              ignorePendingMaterials={ignorePendingMaterials}
              allPhotos={allPhotos}
              obraObservations={obraObservations}
              checklistItems={checklistItems}
              checklistDone={checklistDone}
              warrantyCreated={warrantyCreated}
              postSaleCreated={postSaleCreated}
              savingObra={savingObra}
              finalizando={finalizando}
              onResetFromJob={onResetFromJob}
              onUpdateService={onUpdateService}
              onUpdateRealMaterial={onUpdateRealMaterial}
              onAddService={onAddService}
              onSelectConsumoService={onSelectConsumoService}
              onConsumoInputChange={onConsumoInputChange}
              onConsumoNotesChange={onConsumoNotesChange}
              onRegistrarConsumo={onRegistrarConsumo}
              onDeleteConsumo={onDeleteConsumo}
              onFileUpload={onFileUpload}
              onObraObservationsChange={onObraObservationsChange}
              onChecklistChange={onChecklistChange}
              onSave={onSave}
              onFinalize={onFinalize}
              onGenerateReport={onGenerateReport}
            />
          )}
        </div>
      </div>
    </div>
  );
}
