import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, MessageCircle, XCircle } from "lucide-react";

import { asArray } from "@/lib/safeData";
import type { WhatsappSendLog } from "@shared/schema";

type ConversationViewerProps = {
  logs: WhatsappSendLog[];
  isLoading?: boolean;
};

type Thread = {
  phoneDigits: string;
  displayPhone: string;
  flowName: string | null;
  lastMessage: WhatsappSendLog;
  messages: WhatsappSendLog[];
};

function normalizePhone(phone: string) {
  return (phone || "").replace(/\D/g, "");
}

export function ConversationViewer({ logs, isLoading = false }: ConversationViewerProps) {
  const logsList = asArray<WhatsappSendLog>(logs);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  const threads = useMemo<Thread[]>(() => {
    const byPhone = new Map<string, WhatsappSendLog[]>();
    for (const log of logsList) {
      const digits = normalizePhone(log.phone);
      if (!digits) continue;
      if (!byPhone.has(digits)) byPhone.set(digits, []);
      byPhone.get(digits)!.push(log);
    }
    const result: Thread[] = [];
    for (const [phoneDigits, messages] of byPhone) {
      const sorted = [...messages].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      result.push({
        phoneDigits,
        displayPhone: sorted[sorted.length - 1].phone,
        flowName: sorted[sorted.length - 1].flowName,
        lastMessage: sorted[sorted.length - 1],
        messages: sorted,
      });
    }
    return result.sort((a, b) => new Date(b.lastMessage.createdAt || 0).getTime() - new Date(a.lastMessage.createdAt || 0).getTime());
  }, [logsList]);

  const selectedThread = threads.find(t => t.phoneDigits === selectedPhone) || threads[0] || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando conversas...
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-950">
        <MessageCircle className="mx-auto mb-3 h-10 w-10 opacity-50" />
        <p className="font-medium text-slate-500 dark:text-slate-300">Nenhuma conversa registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 md:grid-cols-[280px_1fr]">
      <div className="max-h-[560px] overflow-y-auto border-b border-slate-200 dark:border-slate-800 md:border-b-0 md:border-r">
        {threads.map(thread => (
          <button
            key={thread.phoneDigits}
            onClick={() => setSelectedPhone(thread.phoneDigits)}
            className={`flex w-full flex-col gap-0.5 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900 ${
              (selectedThread?.phoneDigits === thread.phoneDigits) ? "bg-slate-50 dark:bg-slate-900" : ""
            }`}
          >
            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{thread.displayPhone}</span>
            <span className="truncate text-xs text-slate-500">{thread.lastMessage.message}</span>
            <span className="text-[11px] text-slate-400">
              {thread.lastMessage.createdAt ? format(new Date(thread.lastMessage.createdAt), "dd/MM HH:mm") : ""}
            </span>
          </button>
        ))}
      </div>

      <div className="flex max-h-[560px] flex-col gap-2 overflow-y-auto p-4">
        {selectedThread?.messages.map(message => {
          const isOutbound = message.direction !== "entrada";
          return (
            <div key={message.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isOutbound
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.message}</p>
                <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${isOutbound ? "text-emerald-100" : "text-slate-400"}`}>
                  {message.createdAt ? format(new Date(message.createdAt), "dd/MM HH:mm") : ""}
                  {message.status === "error" && (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-red-200">
                      <XCircle className="h-3 w-3" /> erro
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
