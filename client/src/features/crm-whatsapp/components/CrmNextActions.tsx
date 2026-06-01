import { format } from "date-fns";
import { CalendarClock, MessageCircle, PhoneCall, StickyNote } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CRM_STATUS_LABELS } from "@/features/crm-whatsapp/constants";
import type { CrmLeadOperationalLinks } from "@/features/crm-whatsapp/types";
import type { Lead } from "@shared/schema";

type LeadWithOperationalLinks = Lead & { operationalLinks?: CrmLeadOperationalLinks };

type CrmNextActionsProps = {
  leads: LeadWithOperationalLinks[];
  isLoading?: boolean;
  onContactLead?: (lead: LeadWithOperationalLinks) => void;
};

function getLeadDate(value: Date | string | null) {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}

function getActionLabel(lead: LeadWithOperationalLinks) {
  if (lead.operationalLinks?.nextAction) return lead.operationalLinks.nextAction;
  if (lead.nextContactDate) return "Follow-up agendado";
  if (lead.status === "Proposal") return "Retomar proposta";
  if (lead.status === "Contacted") return "Dar continuidade";
  if (lead.status === "Lost") return "Revisar oportunidade";
  return "Primeiro contato";
}

function formatActionDate(value: Date | string | null) {
  if (!value) return "Sem data definida";
  return format(new Date(value), "dd/MM/yyyy");
}

export function CrmNextActions({ leads, isLoading = false, onContactLead }: CrmNextActionsProps) {
  const actionLeads = leads
    .filter(lead => lead.nextContactDate || lead.operationalLinks?.nextAction || ["New Lead", "Contacted", "Proposal", "Lost"].includes(lead.status))
    .sort((a, b) => getLeadDate(a.nextContactDate) - getLeadDate(b.nextContactDate))
    .slice(0, 6);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Próximas ações</h2>
          <p className="text-sm text-slate-500">Follow-ups e contatos que merecem atenção agora.</p>
        </div>
        <span className="text-xs font-semibold text-slate-400">{actionLeads.length} em destaque</span>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(item => (
            <div key={item} className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
          ))}
        </div>
      ) : actionLeads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-400 dark:border-slate-800">
          <CalendarClock className="mx-auto mb-3 h-9 w-9 opacity-50" />
          <p className="font-medium text-slate-500 dark:text-slate-300">Nenhuma ação pendente</p>
          <p className="mt-1 text-sm">Novos leads e follow-ups aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {actionLeads.map(lead => (
            <article key={lead.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{lead.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                    {formatActionDate(lead.nextContactDate)}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[11px]">
                  {CRM_STATUS_LABELS[lead.status] || lead.status}
                </Badge>
              </div>

              <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-800 dark:bg-slate-950 dark:text-blue-300">
                {getActionLabel(lead)}
              </div>

              {lead.notes && (
                <p className="mt-2 line-clamp-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
                  <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{lead.notes}</span>
                </p>
              )}

              <Button
                size="sm"
                onClick={() => onContactLead?.(lead)}
                className="mt-3 min-h-10 w-full gap-2 bg-green-600 text-white hover:bg-green-700"
                disabled={!lead.phone}
                data-testid={`button-next-action-lead-${lead.id}`}
              >
                {lead.phone ? <MessageCircle className="h-4 w-4" /> : <PhoneCall className="h-4 w-4" />}
                {lead.phone ? "Chamar no WhatsApp" : "Sem telefone"}
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
