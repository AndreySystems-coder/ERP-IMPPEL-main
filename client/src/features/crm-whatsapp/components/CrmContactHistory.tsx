import { ArrowUpRight, ClipboardList, Loader2, RefreshCw, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CrmConversationCard } from "@/features/crm-whatsapp/components/CrmConversationCard";
import { asArray } from "@/lib/safeData";
import type { WhatsappSendLog } from "@shared/schema";

type CrmContactHistoryProps = {
  logs: WhatsappSendLog[];
  isLoading?: boolean;
  onRefresh?: () => void;
};

export function CrmContactHistory({ logs, isLoading = false, onRefresh }: CrmContactHistoryProps) {
  const logsList = asArray<WhatsappSendLog>(logs);
  const sentCount = logsList.filter(log => log.status !== "error").length;
  const errorCount = logsList.filter(log => log.status === "error").length;

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Histórico de conversas</h2>
            <p className="text-sm text-slate-500">
              {logsList.length > 0 ? `${logsList.length} envio(s) registrado(s)` : "Nenhuma conversa registrada ainda"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-green-50 px-3 text-xs font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-300">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {sentCount} enviado(s)
            </span>
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-red-50 px-3 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <XCircle className="h-3.5 w-3.5" />
              {errorCount} erro(s)
            </span>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} className="min-h-9 gap-2">
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(item => (
            <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
          ))}
        </div>
      ) : logsList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-950">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p className="font-medium text-slate-500 dark:text-slate-300">Nenhum envio registrado ainda.</p>
          <p className="mt-1 text-sm">Envie mensagens via WhatsApp para acompanhar o histórico aqui.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {logsList.map((log, index) => (
            <CrmConversationCard key={log.id} log={log} index={index} />
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-2 text-xs font-medium text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Atualizando histórico...
        </div>
      )}
    </section>
  );
}
