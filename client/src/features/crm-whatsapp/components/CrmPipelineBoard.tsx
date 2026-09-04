import { Loader2, Users } from "lucide-react";

import { KanbanBoard, type KanbanColumn } from "@/components/kanban/KanbanBoard";
import { CRM_STATUS_COLUMNS } from "@/features/crm-whatsapp/constants";
import { CrmLeadCard } from "@/features/crm-whatsapp/components/CrmLeadCard";
import type { CrmLeadOperationalLinks } from "@/features/crm-whatsapp/types";
import { useUpdateLead } from "@/hooks/use-leads";
import { useToast } from "@/hooks/use-toast";
import { asArray } from "@/lib/safeData";
import type { Lead } from "@shared/schema";

type LeadWithOperationalLinks = Lead & { operationalLinks?: CrmLeadOperationalLinks };

type CrmPipelineBoardProps = {
  leads: LeadWithOperationalLinks[];
  isLoading?: boolean;
  onContactLead?: (lead: LeadWithOperationalLinks) => void;
};

const KANBAN_COLUMNS: KanbanColumn[] = CRM_STATUS_COLUMNS.map(column => ({
  id: column.id,
  label: column.label,
  description: column.description,
  colorClassName: column.color,
  dotClassName: column.dot,
}));

export function CrmPipelineBoard({ leads, isLoading = false, onContactLead }: CrmPipelineBoardProps) {
  const leadsList = asArray<LeadWithOperationalLinks>(leads);
  const updateLead = useUpdateLead();
  const { toast } = useToast();

  const handleDrop = (lead: LeadWithOperationalLinks, newColumnId: string) => {
    let lossReason: string | undefined;
    if (newColumnId === "Lost") {
      const reason = window.prompt("Motivo da perda deste lead:");
      if (!reason || !reason.trim()) return; // cancelado ou vazio: não move o card
      lossReason = reason.trim();
    }

    updateLead.mutate(
      { id: lead.id, status: newColumnId, ...(lossReason ? { lossReason } : {}) } as any,
      {
        onError: (err: any) => {
          toast({ title: "Não foi possível mover o lead", description: err?.message || "Tente novamente.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando pipeline...
      </div>
    );
  }

  return (
    <KanbanBoard
      columns={KANBAN_COLUMNS}
      items={leadsList}
      getItemId={lead => lead.id}
      getItemColumn={lead => lead.status}
      onDrop={handleDrop}
      emptyIcon={<Users className="mx-auto mb-2 h-5 w-5 opacity-50" />}
      renderCard={lead => <CrmLeadCard lead={lead} compact onContact={onContactLead} />}
    />
  );
}
