import { Bot, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FlowCard } from "@/features/crm-whatsapp/components/FlowCard";
import type { ButtonItem } from "@/features/crm-whatsapp/types";
import type { WhatsappFlow } from "@shared/schema";

type FlowLibraryProps = {
  flows: WhatsappFlow[];
  isLoading?: boolean;
  onCreate: () => void;
  onEdit: (flow: WhatsappFlow) => void;
  onDelete: (flow: WhatsappFlow) => void;
  onSend: (flow: WhatsappFlow) => void;
  onSendButton: (flow: WhatsappFlow, button: ButtonItem) => void;
};

export function FlowLibrary({ flows, isLoading = false, onCreate, onEdit, onDelete, onSend, onSendButton }: FlowLibraryProps) {
  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map(item => (
            <div key={item} className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
          ))}
        </div>
        <div className="flex items-center justify-center py-2 text-xs font-medium text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando fluxos...
        </div>
      </section>
    );
  }

  if (flows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-gray-400 dark:border-slate-800 dark:bg-slate-950">
        <Bot className="mx-auto mb-3 h-12 w-12 opacity-40" />
        <p className="font-medium text-slate-500 dark:text-slate-300">Nenhum fluxo criado ainda.</p>
        <p className="mt-1 text-sm">Crie um fluxo para padronizar respostas e follow-ups no WhatsApp.</p>
        <Button onClick={onCreate} className="mt-4 min-h-10 gap-2">
          <Plus className="h-4 w-4" />
          Criar Primeiro Fluxo
        </Button>
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {flows.map(flow => (
        <FlowCard
          key={flow.id}
          flow={flow}
          onEdit={() => onEdit(flow)}
          onDelete={() => onDelete(flow)}
          onSend={() => onSend(flow)}
          onSendButton={button => onSendButton(flow, button)}
        />
      ))}
    </section>
  );
}
