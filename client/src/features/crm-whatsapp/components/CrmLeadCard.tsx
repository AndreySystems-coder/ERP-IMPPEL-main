import { format } from "date-fns";
import { Briefcase, CalendarClock, ClipboardList, MessageCircle, Phone, ShieldCheck, Star, StickyNote, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CRM_STATUS_LABELS } from "@/features/crm-whatsapp/constants";
import type { CrmLeadOperationalLinks } from "@/features/crm-whatsapp/types";
import type { Lead } from "@shared/schema";

type LeadWithOperationalLinks = Lead & { operationalLinks?: CrmLeadOperationalLinks };

type CrmLeadCardProps = {
  lead: LeadWithOperationalLinks;
  compact?: boolean;
  onContact?: (lead: LeadWithOperationalLinks) => void;
};

export function CrmLeadCard({ lead, compact = false, onContact }: CrmLeadCardProps) {
  const createdAt = lead.createdAt ? format(new Date(lead.createdAt), "dd/MM/yyyy") : "Sem data";
  const nextContact = lead.nextContactDate ? format(new Date(lead.nextContactDate), "dd/MM") : null;
  const quotes = lead.operationalLinks?.quotes || [];
  const workOrders = lead.operationalLinks?.workOrders || [];
  const warranties = lead.operationalLinks?.warranties || [];
  const latestQuote = quotes[0];
  const latestWorkOrder = workOrders[0];
  const latestWarranty = warranties[0];

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{lead.name}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{lead.source || "Origem não informada"}</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[11px]">
          {CRM_STATUS_LABELS[lead.status] || lead.status}
        </Badge>
      </div>

      {!compact && lead.notes && (
        <p className="mt-3 line-clamp-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {lead.notes}
        </p>
      )}

      {(quotes.length > 0 || workOrders.length > 0 || warranties.length > 0) && (
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          {latestQuote && (
            <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
              <span className="inline-flex items-center gap-1.5 font-bold">
                <ClipboardList className="h-3.5 w-3.5" />
                Orçamento #{String(latestQuote.orcamentoNumero ?? latestQuote.id).padStart(4, "0")}
              </span>
              <p className="mt-0.5 truncate text-[11px] opacity-80">{latestQuote.status || "Sem status"}</p>
            </div>
          )}
          {latestWorkOrder && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
              <span className="inline-flex items-center gap-1.5 font-bold">
                <Briefcase className="h-3.5 w-3.5" />
                OS #{latestWorkOrder.id}
              </span>
              <p className="mt-0.5 truncate text-[11px] opacity-80">{latestWorkOrder.status || "Sem status"}</p>
            </div>
          )}
          {latestWarranty && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
              <span className="inline-flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-3.5 w-3.5" />
                Garantia #{latestWarranty.id}
              </span>
              <p className="mt-0.5 truncate text-[11px] opacity-80">{latestWarranty.status || "ativa"}</p>
            </div>
          )}
        </div>
      )}

      {((lead.operationalLinks?.npsPending || 0) > 0 || (lead.operationalLinks?.maintenancePending || 0) > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(lead.operationalLinks?.npsPending || 0) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700">
              <Star className="h-3 w-3" /> NPS pendente
            </span>
          )}
          {(lead.operationalLinks?.maintenancePending || 0) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-[11px] font-bold text-sky-700">
              <Wrench className="h-3 w-3" /> Manutenção
            </span>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{lead.phone || "Sem telefone"}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          {nextContact || createdAt}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {lead.notes && compact && <StickyNote className="h-4 w-4 text-slate-400" />}
        {lead.operationalLinks?.nextAction && (
          <span className="min-w-0 truncate rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {lead.operationalLinks.nextAction}
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onContact?.(lead)}
          className="ml-auto min-h-9 gap-1.5 text-xs text-green-700 hover:bg-green-50 hover:text-green-800"
          disabled={!lead.phone}
          data-testid={`button-contact-lead-${lead.id}`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </Button>
      </div>
    </article>
  );
}
