import { AlertTriangle, CheckCircle, ClipboardList, FileDown, MessageCircle, Shield, Star, Wrench } from "lucide-react";

import { Button } from "@/components/Button";
import type { ServiceProgress } from "@/features/work-orders/types";

type ChecklistItem = { key: string; label: string };

type WorkOrderFinalizationPanelProps = {
  detailWO: any;
  serviceProgress: ServiceProgress[];
  checklistItems: readonly ChecklistItem[];
  checklistDone: Record<string, boolean>;
  warrantyCreated: any;
  postSaleCreated: any;
  pendingMaterials: any[];
  ignorePendingMaterials: boolean;
  savingObra: boolean;
  finalizando: boolean;
  onChecklistChange: (key: string, checked: boolean) => void;
  onSave: () => void;
  onFinalize: () => void;
  onGenerateReport: () => void;
};

export function WorkOrderFinalizationPanel({
  detailWO,
  serviceProgress,
  checklistItems,
  checklistDone,
  warrantyCreated,
  postSaleCreated,
  pendingMaterials,
  ignorePendingMaterials,
  savingObra,
  finalizando,
  onChecklistChange,
  onSave,
  onFinalize,
  onGenerateReport,
}: WorkOrderFinalizationPanelProps) {
  const checklistComplete = checklistItems.every(item => checklistDone[item.key]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-bold text-amber-800">Checklist final</h3>
          <span className="ml-auto text-xs text-amber-600">{checklistItems.filter(item => checklistDone[item.key]).length}/{checklistItems.length} concluídos</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {checklistItems.map(item => (
            <label key={item.key} className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition-all ${checklistDone[item.key] ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:border-amber-300"}`} data-testid={`checklist-${item.key}`}>
              <input type="checkbox" checked={!!checklistDone[item.key]} onChange={event => onChecklistChange(item.key, event.target.checked)} className="h-4 w-4 accent-emerald-600" />
              <span className="text-xs font-medium">{item.label}</span>
            </label>
          ))}
        </div>
        {checklistComplete && <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle className="h-3.5 w-3.5" /> Checklist completo! A obra pode ser finalizada.</p>}
      </div>

      {warrantyCreated && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-emerald-800">Garantia de 12 meses criada!</p>
            <p className="mt-0.5 text-xs text-emerald-700">Válida até {warrantyCreated.endDate ? new Date(warrantyCreated.endDate + "T12:00:00").toLocaleDateString("pt-BR") : "-"}</p>
            {warrantyCreated.clientPhone && (
              <a href={`https://wa.me/${warrantyCreated.clientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${warrantyCreated.clientName || detailWO?.clientName}! Sua obra foi concluída com sucesso. Sua garantia de 12 meses está ativa. Em caso de dúvidas ou ocorrências, entre em contato. - IMPPEL`)}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-green-700" data-testid="link-whatsapp-warranty">
                <MessageCircle className="h-3.5 w-3.5" /> Enviar Garantia por WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      {postSaleCreated && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Star className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-bold text-amber-800">NPS pendente sinalizado</p>
              <p className="mt-0.5 text-xs text-amber-700">O cliente ficou no pós-venda para avaliação de satisfação.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
            <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
            <div>
              <p className="text-sm font-bold text-sky-800">Lembrete de manutenção sinalizado</p>
              <p className="mt-0.5 text-xs text-sky-700">Acompanhamento de 12 e 24 meses ficou sinalizado.</p>
            </div>
          </div>
        </div>
      )}

      {pendingMaterials.length > 0 && detailWO?.status !== "Concluída" && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3" data-testid="alert-pending-materials">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{pendingMaterials.length} retirada(s) de material sem retorno</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Registre o retorno no Controle de Materiais antes de finalizar a obra.
              {ignorePendingMaterials && " Clique em finalizar novamente para confirmar mesmo assim."}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row">
        <Button onClick={onSave} isLoading={savingObra} variant="outline" className="min-h-11 flex-1" data-testid="button-save-obra">
          <ClipboardList className="mr-2 h-4 w-4" /> Salvar progresso
        </Button>
        {serviceProgress.length > 0 && serviceProgress.every(service => service.finished) && detailWO?.status !== "Concluída" && (
          <Button onClick={onFinalize} isLoading={finalizando} className={`min-h-11 flex-1 ${ignorePendingMaterials ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`} data-testid="button-finalizar-obra">
            <CheckCircle className="mr-2 h-4 w-4" />
            {ignorePendingMaterials ? "Confirmar finalização" : "Finalizar OS + PDF"}
          </Button>
        )}
        {detailWO?.status === "Concluída" && (
          <Button variant="outline" onClick={onGenerateReport} className="min-h-11 flex items-center gap-2" data-testid="button-generate-report">
            <FileDown className="h-4 w-4" /> Baixar relatório PDF
          </Button>
        )}
      </div>
    </section>
  );
}
