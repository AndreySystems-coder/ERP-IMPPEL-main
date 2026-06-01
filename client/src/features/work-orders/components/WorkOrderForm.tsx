import type { ChangeEvent, FormEvent } from "react";
import { CalendarDays, ClipboardList, ImagePlus, Package, UserRound, X, type LucideIcon } from "lucide-react";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { getDisplayUnit, parseMaterialsNeeded } from "@/features/work-orders/utils";

type WorkOrderPhoto = {
  category: string;
  data: string;
  timestamp: string;
};

type WorkOrderFormProps = {
  isOpen: boolean;
  editingWO: any;
  clientName: string;
  address: string;
  serviceType: string;
  scheduledDate: string;
  teamAssigned: string;
  status: string;
  notes: string;
  photos: WorkOrderPhoto[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onClientNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onServiceTypeChange: (value: string) => void;
  onScheduledDateChange: (value: string) => void;
  onTeamAssignedChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>, category: string) => void;
  onRemovePhoto: (index: number) => void;
};

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
    </div>
  );
}

export function WorkOrderForm({
  isOpen,
  editingWO,
  clientName,
  address,
  serviceType,
  scheduledDate,
  teamAssigned,
  status,
  notes,
  photos,
  isSaving,
  onClose,
  onSubmit,
  onClientNameChange,
  onAddressChange,
  onServiceTypeChange,
  onScheduledDateChange,
  onTeamAssignedChange,
  onStatusChange,
  onNotesChange,
  onFileUpload,
  onRemovePhoto,
}: WorkOrderFormProps) {
  const materials = parseMaterialsNeeded(editingWO?.materialsNeeded);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingWO ? "Editar Ordem" : "Criar Ordem"} size="lg">
      <form onSubmit={onSubmit} className="flex max-h-[78vh] flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto px-0.5 py-2 pr-1">
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
            <SectionTitle icon={UserRound} title="Cliente e obra" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Cliente *" required value={clientName} onChange={event => onClientNameChange(event.target.value)} data-testid="input-wo-client" />
              <Input label="Serviço *" required value={serviceType} onChange={event => onServiceTypeChange(event.target.value)} data-testid="input-wo-service" />
              <div className="sm:col-span-2">
                <Input label="Endereço" value={address} onChange={event => onAddressChange(event.target.value)} data-testid="input-wo-address" />
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
            <SectionTitle icon={CalendarDays} title="Agenda e responsável" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Data Agendada" type="date" value={scheduledDate} onChange={event => onScheduledDateChange(event.target.value)} data-testid="input-wo-date" />
              <Input label="Equipe Atribuída" value={teamAssigned} onChange={event => onTeamAssignedChange(event.target.value)} data-testid="input-wo-team" />
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
            <SectionTitle icon={ClipboardList} title="Status e observações" />
            <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
                <select value={status} onChange={event => onStatusChange(event.target.value)} className="min-h-11 w-full rounded-xl border-2 border-border bg-slate-50 px-4 py-2.5 transition-all focus:border-primary focus:outline-none" data-testid="select-wo-status">
                  <option value="Planejada">Planejada</option>
                  <option value="Agendada">Agendada</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluída">Concluída</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Observações</label>
                <textarea value={notes} onChange={event => onNotesChange(event.target.value)} className="min-h-24 w-full resize-none rounded-xl border-2 border-border bg-slate-50 px-4 py-3 transition-all focus:border-primary focus:outline-none" placeholder="Observações..." data-testid="input-wo-notes" />
              </div>
            </div>
          </section>

          {materials.length > 0 && (
            <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 sm:p-4">
              <SectionTitle icon={Package} title="Materiais necessários" />
              <div className="grid gap-2 sm:grid-cols-2">
                {materials.map((material, index) => (
                  <div key={`${material.name}-${index}`} className="flex justify-between gap-3 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm text-slate-700">
                    <span className="truncate">{material.name}</span>
                    <span className="shrink-0 font-bold text-emerald-700">{Math.ceil(material.quantity)} {getDisplayUnit(material)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
            <SectionTitle icon={ImagePlus} title="Fotos da obra" />
            <div className="grid gap-3 sm:grid-cols-3">
              {["antes", "durante", "depois"].map(category => (
                <label key={category} className="flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center transition-colors hover:border-primary hover:bg-primary/5">
                  <ImagePlus className="mb-1 h-5 w-5 text-slate-400" />
                  <span className="text-xs font-bold capitalize text-slate-600">{category}</span>
                  <span className="mt-0.5 text-[11px] text-slate-400">Adicionar foto</span>
                  <input type="file" accept="image/*" onChange={event => onFileUpload(event, category)} className="hidden" data-testid={`input-photo-${category}`} />
                </label>
              ))}
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {photos.map((photo, index) => (
                  <div key={`${photo.category}-${index}`} className="group relative overflow-hidden rounded-lg border border-slate-200">
                    <img src={photo.data} alt={photo.category} className="h-20 w-full object-cover" />
                    <span className="absolute left-0 top-0 rounded-br bg-primary px-1.5 py-0.5 text-[10px] capitalize text-white">{photo.category}</span>
                    <button type="button" onClick={() => onRemovePhoto(index)} className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100" data-testid={`button-remove-photo-${index}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="sticky bottom-0 mt-4 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white pt-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} className="min-h-11">Cancelar</Button>
          <Button type="submit" isLoading={isSaving} className="min-h-11" data-testid="button-submit-wo">{editingWO ? "Salvar" : "Criar"}</Button>
        </div>
      </form>
    </Modal>
  );
}
