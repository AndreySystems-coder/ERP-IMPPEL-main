import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Briefcase, ClipboardList, Edit2, Trash2 } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

import { Button } from "@/components/Button";
import { KanbanBoard, type KanbanColumn } from "@/components/kanban/KanbanBoard";

const FALLBACK_STATUSES = ["Planejada", "Agendada", "Em Andamento", "Concluída", "Recusado"];

type WorkOrderBoardProps = {
  workOrders: any[];
  statuses?: string[];
  isLoading?: boolean;
  onStatusChange: (workOrder: any, newStatus: string) => void;
  onWhatsApp: (workOrder: any) => void;
  onDetail: (workOrder: any) => void;
  onEdit: (workOrder: any) => void;
  onDelete: (workOrder: any) => void;
};

export function WorkOrderBoard({
  workOrders,
  statuses = FALLBACK_STATUSES,
  isLoading = false,
  onStatusChange,
  onWhatsApp,
  onDetail,
  onEdit,
  onDelete,
}: WorkOrderBoardProps) {
  const columns: KanbanColumn[] = statuses.map(name => ({
    id: name,
    label: name,
    colorClassName: "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40",
  }));

  return (
    <KanbanBoard
      columns={columns}
      items={workOrders}
      isLoading={isLoading}
      getItemId={workOrder => workOrder.id}
      getItemColumn={workOrder => workOrder.status}
      onDrop={(workOrder, newStatus) => onStatusChange(workOrder, newStatus)}
      emptyIcon={<Briefcase className="mx-auto mb-2 h-5 w-5 opacity-50" />}
      renderCard={workOrder => (
        <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">OS #{workOrder.id}</p>
              <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{workOrder.clientName}</h3>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{workOrder.serviceType}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {workOrder.scheduledDate ? format(new Date(workOrder.scheduledDate), "dd/MM/yyyy", { locale: ptBR }) : "Sem data agendada"}
          </p>
          <div className="mt-2 flex items-center justify-end gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => onWhatsApp(workOrder)} className="text-green-600 hover:bg-green-50" title="Enviar atualização via WhatsApp">
              <SiWhatsapp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDetail(workOrder)} title="Registro de Obra">
              <ClipboardList className="h-4 w-4 text-slate-500" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(workOrder)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => onDelete(workOrder)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </article>
      )}
    />
  );
}
