import { MessageCircle, MessageSquare, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type CrmWhatsappHeaderProps = {
  tab: string;
  onNewTemplate: () => void;
  onNewFlow: () => void;
  onRefreshLogs: () => void;
};

export function CrmWhatsappHeader({ tab, onNewTemplate, onNewFlow, onRefreshLogs }: CrmWhatsappHeaderProps) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            CRM & WhatsApp
          </h1>
          <p className="mt-1 text-sm text-gray-500">Central de mensagens, templates e fluxos de atendimento</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tab === "mensagens" && (
            <Button
              onClick={onNewTemplate}
              className="min-h-10 gap-2 bg-blue-700 text-white hover:bg-blue-800"
              data-testid="btn-new-template"
            >
              <Plus className="h-4 w-4" />
              Novo Template
            </Button>
          )}
          {tab === "fluxos" && (
            <Button
              onClick={onNewFlow}
              className="min-h-10 gap-2 bg-blue-700 text-white hover:bg-blue-800"
              data-testid="btn-new-flow"
            >
              <Plus className="h-4 w-4" />
              Novo Fluxo
            </Button>
          )}
          {tab === "logs" && (
            <Button variant="outline" size="sm" onClick={onRefreshLogs} className="min-h-10 gap-2" data-testid="btn-refresh-logs">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <span className="font-semibold">Como funciona:</span> Crie templates na aba <strong>Mensagens</strong> e use-os em qualquer lugar. Nos <strong>Orçamentos</strong> e <strong>Ordens de Serviço</strong> há botões de envio rápido. Todos os envios abrem o WhatsApp Web com a mensagem pronta (link wa.me).
        </div>
      </div>
    </>
  );
}
