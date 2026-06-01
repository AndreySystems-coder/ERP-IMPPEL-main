import { AlertCircle, ArrowUpRight, Phone, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { WhatsappSendLog } from "@shared/schema";

type CrmConversationCardProps = {
  log: WhatsappSendLog;
  index?: number;
};

function formatLogDate(value: Date | string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CrmConversationCard({ log, index = 0 }: CrmConversationCardProps) {
  const isError = log.status === "error";

  return (
    <article
      className={`rounded-xl border p-3 shadow-sm transition-colors sm:p-4 ${
        isError
          ? "border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/20"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
      }`}
      data-testid={`log-row-${index}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            isError
              ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"
              : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          }`}
        >
          {isError ? <XCircle className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                {log.flowName || "Envio manual"}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="min-h-7 max-w-full text-xs">
                  <Phone className="mr-1 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{log.phone}</span>
                </Badge>
                <span className="text-xs font-medium text-slate-400">{formatLogDate(log.createdAt)}</span>
              </div>
            </div>

            <Badge
              className={`w-fit border-0 text-xs ${
                isError
                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                  : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
              }`}
            >
              {isError ? "Erro" : "Enviado"}
            </Badge>
          </div>

          <p className="mt-3 line-clamp-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {log.message}
          </p>

          {log.errorMessage && (
            <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-red-600 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{log.errorMessage}</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
