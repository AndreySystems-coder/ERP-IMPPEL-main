import { useMutation } from "@tanstack/react-query";
import { Loader2, Workflow } from "lucide-react";

import { KanbanBoard, type KanbanColumn } from "@/components/kanban/KanbanBoard";
import { CrmLeadCard } from "@/features/crm-whatsapp/components/CrmLeadCard";
import type { CrmLeadOperationalLinks } from "@/features/crm-whatsapp/types";
import { useUpdateLead } from "@/hooks/use-leads";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { asArray } from "@/lib/safeData";
import type { Lead, WhatsappFlow } from "@shared/schema";

type LeadWithOperationalLinks = Lead & { operationalLinks?: CrmLeadOperationalLinks };

const SEM_FLUXO_COLUMN_ID = "__sem_fluxo__";

type FlowStageBoardProps = {
  leads: LeadWithOperationalLinks[];
  flows: WhatsappFlow[];
  isLoading?: boolean;
  onContactLead?: (lead: LeadWithOperationalLinks) => void;
};

// Quadro separado do Pipeline de status: acompanha em qual fluxo de atendimento (dos
// templates cadastrados na aba Fluxos) cada lead está no momento, permitindo arrastar
// entre eles manualmente conforme a conversa avança.
export function FlowStageBoard({ leads, flows, isLoading = false, onContactLead }: FlowStageBoardProps) {
  const leadsList = asArray<LeadWithOperationalLinks>(leads);
  const activeFlows = asArray<WhatsappFlow>(flows)
    .filter(flow => flow.active)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const updateLead = useUpdateLead();
  const { toast } = useToast();

  const sendFlowMutation = useMutation({
    mutationFn: ({ leadId, flowId }: { leadId: number; flowId: number }) =>
      apiRequest("POST", `/api/leads/${leadId}/send-flow`, { flowId }).then(res => res.json()),
  });

  const columns: KanbanColumn[] = [
    { id: SEM_FLUXO_COLUMN_ID, label: "Sem fluxo", description: "Ainda não classificado" },
    ...activeFlows.map(flow => ({ id: flow.trigger, label: flow.name })),
  ];

  const handleDrop = (lead: LeadWithOperationalLinks, newColumnId: string) => {
    const targetFlow = activeFlows.find(flow => flow.trigger === newColumnId);

    updateLead.mutate(
      { id: lead.id, currentFlowTrigger: newColumnId === SEM_FLUXO_COLUMN_ID ? null : newColumnId } as any,
      {
        onError: (err: any) => {
          toast({ title: "Não foi possível mover o lead", description: err?.message || "Tente novamente.", variant: "destructive" });
        },
        onSuccess: () => {
          if (!targetFlow) return; // "Sem fluxo": só reclassifica, não manda nada.
          if (!lead.phone) {
            toast({ title: "Card movido, mas nada foi enviado", description: "Este lead não tem telefone cadastrado.", variant: "destructive" });
            return;
          }
          sendFlowMutation.mutate(
            { leadId: lead.id, flowId: targetFlow.id },
            {
              onSuccess: result => {
                toast({
                  title: result.ok ? `Mensagem de "${targetFlow.name}" enviada` : "Card movido, mas o envio falhou",
                  description: result.ok ? `Enviada para ${lead.name}.` : (result.log?.errorMessage || result.message || "Verifique a configuração da Evolution API em Automação."),
                  variant: result.ok ? "default" : "destructive",
                });
              },
              onError: (err: any) => {
                toast({ title: "Card movido, mas o envio falhou", description: err?.message, variant: "destructive" });
              },
            }
          );
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando fluxos...
      </div>
    );
  }

  if (activeFlows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950">
        <Workflow className="h-6 w-6 opacity-50" />
        Nenhum fluxo ativo cadastrado ainda. Crie fluxos na aba "Fluxos" para usar este quadro.
      </div>
    );
  }

  return (
    <KanbanBoard
      columns={columns}
      items={leadsList}
      getItemId={lead => lead.id}
      getItemColumn={lead => lead.currentFlowTrigger || SEM_FLUXO_COLUMN_ID}
      onDrop={handleDrop}
      emptyIcon={<Workflow className="mx-auto mb-2 h-5 w-5 opacity-50" />}
      renderCard={lead => <CrmLeadCard lead={lead} compact onContact={onContactLead} />}
    />
  );
}
