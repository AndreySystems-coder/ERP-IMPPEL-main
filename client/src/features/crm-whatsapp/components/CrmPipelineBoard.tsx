import { Loader2, Users } from "lucide-react";

import { CRM_STATUS_COLUMNS } from "@/features/crm-whatsapp/constants";
import { CrmLeadCard } from "@/features/crm-whatsapp/components/CrmLeadCard";
import type { CrmLeadOperationalLinks } from "@/features/crm-whatsapp/types";
import { asArray } from "@/lib/safeData";
import type { Lead } from "@shared/schema";

type LeadWithOperationalLinks = Lead & { operationalLinks?: CrmLeadOperationalLinks };

type CrmPipelineBoardProps = {
  leads: LeadWithOperationalLinks[];
  isLoading?: boolean;
  onContactLead?: (lead: LeadWithOperationalLinks) => void;
};

export function CrmPipelineBoard({ leads, isLoading = false, onContactLead }: CrmPipelineBoardProps) {
  const leadsList = asArray<LeadWithOperationalLinks>(leads);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando pipeline...
      </div>
    );
  }

  return (
    <section className="overflow-x-auto pb-3">
      <div className="grid grid-cols-1 gap-3 md:min-w-[980px] md:grid-cols-5 xl:min-w-0">
        {CRM_STATUS_COLUMNS.map(column => {
          const columnLeads = leadsList.filter(lead => lead.status === column.id);

          return (
            <div key={column.id} className={`rounded-xl border p-3 ${column.color}`}>
              <div className="mb-3 flex items-start gap-2">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${column.dot}`} />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{column.label}</h3>
                  <p className="text-xs text-slate-500">{column.description}</p>
                </div>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                  {columnLeads.length}
                </span>
              </div>

              <div className="space-y-2">
                {columnLeads.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-950/60">
                    <Users className="mx-auto mb-2 h-5 w-5 opacity-50" />
                    Sem registros
                  </div>
                ) : (
                  columnLeads.map(lead => <CrmLeadCard key={lead.id} lead={lead} compact onContact={onContactLead} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
