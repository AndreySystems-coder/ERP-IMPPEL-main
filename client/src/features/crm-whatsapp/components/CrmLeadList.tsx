import { Loader2, MessageCircle, Phone, UserCheck, Users } from "lucide-react";

import { CrmLeadCard } from "@/features/crm-whatsapp/components/CrmLeadCard";
import type { CrmLeadOperationalLinks } from "@/features/crm-whatsapp/types";
import { asArray } from "@/lib/safeData";
import type { Client, Lead, WhatsappSendLog } from "@shared/schema";

type LeadWithOperationalLinks = Lead & { operationalLinks?: CrmLeadOperationalLinks };

type CrmLeadListProps = {
  leads: LeadWithOperationalLinks[];
  clients: Client[];
  logs: WhatsappSendLog[];
  isLoading?: boolean;
  onContactLead?: (lead: LeadWithOperationalLinks) => void;
};

export function CrmLeadList({ leads, clients, logs, isLoading = false, onContactLead }: CrmLeadListProps) {
  const leadsList = asArray<LeadWithOperationalLinks>(leads);
  const clientsList = asArray<Client>(clients);
  const logsList = asArray<WhatsappSendLog>(logs);
  const activeConversations = logsList.filter(log => log.status !== "error").length;
  const nextActions = leadsList.filter(lead => lead.nextContactDate || lead.operationalLinks?.nextAction || ["Contacted", "Proposal", "Lost"].includes(lead.status));
  const contacts = leadsList.filter(lead => lead.status === "Contacted");
  const quotes = leadsList.filter(lead => (lead.operationalLinks?.quotes.length || 0) > 0);
  const activeClients = leadsList.filter(lead => (lead.operationalLinks?.workOrders.length || 0) > 0);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <MetricCard icon={Users} label="Leads" value={leadsList.length} />
        <MetricCard icon={Phone} label="Contatos" value={contacts.length} />
        <MetricCard icon={UserCheck} label="Clientes" value={Math.max(clientsList.length, activeClients.length)} />
        <MetricCard icon={MessageCircle} label="Conversas" value={activeConversations} />
        <MetricCard icon={MessageCircle} label="Orçamentos" value={quotes.length} />
        <MetricCard icon={Loader2} label="Próximas ações" value={nextActions.length} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Lista principal</h2>
            <p className="text-sm text-slate-500">Leads, contatos e próximas ações em uma visão rápida.</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">{leadsList.length} registro(s)</span>
        </div>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map(item => <div key={item} className="h-36 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />)}
          </div>
        ) : leadsList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400 dark:border-slate-800">
            <Users className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p className="font-medium">Nenhum lead encontrado</p>
            <p className="mt-1 text-sm">Ajuste os filtros ou cadastre novos leads.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {leadsList.map(lead => <CrmLeadCard key={lead.id} lead={lead} onContact={onContactLead} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
