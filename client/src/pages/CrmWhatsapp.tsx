import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ClipboardList, Library, Users, Zap } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { asArray } from "@/lib/safeData";
import { CrmContactHistory } from "@/features/crm-whatsapp/components/CrmContactHistory";
import { CrmFilters } from "@/features/crm-whatsapp/components/CrmFilters";
import { CrmLeadList } from "@/features/crm-whatsapp/components/CrmLeadList";
import { CrmNextActions } from "@/features/crm-whatsapp/components/CrmNextActions";
import { CrmPipelineBoard } from "@/features/crm-whatsapp/components/CrmPipelineBoard";
import { CrmWhatsappHeader } from "@/features/crm-whatsapp/components/CrmWhatsappHeader";
import { FlowLibrary } from "@/features/crm-whatsapp/components/FlowLibrary";
import { FlowModal } from "@/features/crm-whatsapp/components/FlowModal";
import { SendModal } from "@/features/crm-whatsapp/components/SendModal";
import { TemplateLibrary } from "@/features/crm-whatsapp/components/TemplateLibrary";
import { TemplateModal } from "@/features/crm-whatsapp/components/TemplateModal";
import type { ButtonItem, CrmLeadOperationalLinks, SendTarget, WhatsappTemplate } from "@/features/crm-whatsapp/types";
import type { Client, Job, Lead, MaintenanceReminder, NpsResponse, Warranty, WhatsappFlow, WhatsappSendLog, WorkOrder } from "@shared/schema";

type CrmLeadWithLinks = Lead & { operationalLinks?: CrmLeadOperationalLinks };

export default function CrmWhatsapp() {
  const { toast } = useToast();
  const [tab, setTab] = useState("mensagens");
  const [flowModalOpen, setFlowModalOpen] = useState(false);
  const [editFlow, setEditFlow] = useState<WhatsappFlow | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<WhatsappTemplate | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<SendTarget | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [crmSearch, setCrmSearch] = useState("");
  const [crmStatus, setCrmStatus] = useState("all");
  const [crmSource, setCrmSource] = useState("all");

  const { data: flows = [], isLoading: flowsLoading } = useQuery<WhatsappFlow[]>({ queryKey: ["/api/whatsapp-flows"] });
  const { data: templates = [], isLoading: templatesLoading } = useQuery<WhatsappTemplate[]>({ queryKey: ["/api/whatsapp-templates"] });
  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });
  const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery<WorkOrder[]>({ queryKey: ["/api/work-orders"] });
  const { data: warranties = [], isLoading: warrantiesLoading } = useQuery<Warranty[]>({ queryKey: ["/api/warranties"] });
  const { data: npsResponses = [], isLoading: npsLoading } = useQuery<NpsResponse[]>({ queryKey: ["/api/nps-responses"] });
  const { data: maintenanceReminders = [], isLoading: maintenanceLoading } = useQuery<MaintenanceReminder[]>({ queryKey: ["/api/maintenance-reminders"] });
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: logs = [], isLoading: logsLoading } = useQuery<WhatsappSendLog[]>({
    queryKey: ["/api/whatsapp-logs"],
    enabled: tab === "logs" || tab === "kanban",
    refetchInterval: tab === "logs" ? 10000 : false,
  });
  const flowsList = asArray<WhatsappFlow>(flows);
  const templatesList = asArray<WhatsappTemplate>(templates);
  const leadsList = asArray<Lead>(leads);
  const jobsList = asArray<Job>(jobs);
  const workOrdersList = asArray<WorkOrder>(workOrders);
  const warrantiesList = asArray<Warranty>(warranties);
  const npsResponsesList = asArray<NpsResponse>(npsResponses);
  const maintenanceRemindersList = asArray<MaintenanceReminder>(maintenanceReminders);
  const clientsList = asArray<Client>(clients);
  const logsList = asArray<WhatsappSendLog>(logs);

  const deleteFlowMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/whatsapp-flows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-flows"] });
      toast({ title: "Fluxo removido." });
    },
    onError: (e: any) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/whatsapp-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-templates"] });
      toast({ title: "Template removido." });
    },
    onError: (e: any) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });

  const openSend = (flow: WhatsappFlow) => {
    setSendTarget({ flowId: flow.id, flowName: flow.name, message: flow.message });
    setSendModalOpen(true);
  };

  const openSendButton = (flow: WhatsappFlow, btn: ButtonItem) => {
    setSendTarget({ flowId: flow.id, flowName: `${flow.name} -> ${btn.text}`, message: btn.responseMessage });
    setSendModalOpen(true);
  };

  const openSendTemplate = (tpl: WhatsappTemplate) => {
    setSendTarget({ templateId: tpl.id, templateName: tpl.name, flowName: tpl.name, message: tpl.message });
    setSendModalOpen(true);
  };

  const openSendLead = (lead: CrmLeadWithLinks) => {
    setSendTarget({
      flowName: `Lead - ${lead.name}`,
      message: `Olá ${lead.name}! Aqui é da IMPPEL Impermeabilização.\n\nVi seu contato e posso te ajudar com o orçamento. Pode me passar mais detalhes da obra?`,
      phone: lead.phone,
    });
    setSendModalOpen(true);
  };

  const sortedFlows = [...flowsList].sort((a, b) => {
    if (a.trigger === "atendimento_inicial") return -1;
    if (b.trigger === "atendimento_inicial") return 1;
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });

  const filteredTemplates = categoryFilter === "all" ? templatesList : templatesList.filter(t => t.category === categoryFilter);

  const crmSources = useMemo(() => {
    return Array.from(new Set(leadsList.map(lead => lead.source).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
  }, [leadsList]);

  const crmLeads = useMemo<CrmLeadWithLinks[]>(() => {
    return leadsList.map(lead => {
      const quoteLinks = jobsList
        .filter(job => Number(job.leadId) === lead.id)
        .sort((a, b) => Number(b.id) - Number(a.id))
        .map(job => ({
          id: job.id,
          orcamentoNumero: job.orcamentoNumero,
          status: job.status,
          realPriceSold: job.realPriceSold,
          serviceType: job.serviceType,
        }));
      const quoteIds = new Set(quoteLinks.map(quote => quote.id));
      const workOrderLinks = workOrdersList
        .filter(workOrder => workOrder.jobId && quoteIds.has(Number(workOrder.jobId)))
        .sort((a, b) => Number(b.id) - Number(a.id))
        .map(workOrder => ({
          id: workOrder.id,
          status: workOrder.status,
          serviceType: workOrder.serviceType,
        }));
      const workOrderIds = new Set(workOrderLinks.map(workOrder => workOrder.id));
      const warrantyLinks = warrantiesList
        .filter(warranty => warranty.workOrderId && workOrderIds.has(Number(warranty.workOrderId)))
        .sort((a, b) => Number(b.id) - Number(a.id))
        .map(warranty => ({ id: warranty.id, status: warranty.status, endDate: warranty.endDate }));
      const npsPending = npsResponsesList.filter(nps => nps.workOrderId && workOrderIds.has(Number(nps.workOrderId)) && nps.status === "pendente").length;
      const maintenancePending = maintenanceRemindersList.filter(reminder =>
        reminder.workOrderId &&
        workOrderIds.has(Number(reminder.workOrderId)) &&
        (!reminder.reminder12SentAt || !reminder.reminder24SentAt)
      ).length;

      const nextAction = npsPending > 0
        ? "Enviar NPS / pós-venda"
        : maintenancePending > 0
          ? "Acompanhar manutenção"
          : warrantyLinks.length > 0
            ? "Garantia ativa"
            : workOrderLinks.length > 0
        ? "Acompanhar execução da OS"
        : quoteLinks.length > 0
          ? "Acompanhar orçamento enviado"
          : lead.nextContactDate
            ? "Follow-up agendado"
            : "Primeiro contato";

      return {
        ...lead,
        operationalLinks: {
          quotes: quoteLinks,
          workOrders: workOrderLinks,
          warranties: warrantyLinks,
          npsPending,
          maintenancePending,
          nextAction,
        },
      };
    });
  }, [jobsList, leadsList, maintenanceRemindersList, npsResponsesList, warrantiesList, workOrdersList]);

  const filteredCrmLeads = useMemo(() => {
    const term = crmSearch.trim().toLowerCase();

    return crmLeads.filter(lead => {
      const matchesSearch = !term || [
        lead.name,
        lead.phone,
        lead.source,
        lead.status,
        lead.notes,
        ...((lead.operationalLinks?.quotes || []).map(quote => `orcamento ${quote.orcamentoNumero ?? quote.id} ${quote.status || ""}`)),
        ...((lead.operationalLinks?.workOrders || []).map(workOrder => `os ${workOrder.id} ${workOrder.status || ""}`)),
        ...((lead.operationalLinks?.warranties || []).map(warranty => `garantia ${warranty.id} ${warranty.status || ""}`)),
        lead.operationalLinks?.npsPending ? "nps pendente pos-venda pós-venda" : "",
        lead.operationalLinks?.maintenancePending ? "manutencao manutenção pendente" : "",
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term));
      const matchesStatus = crmStatus === "all" || lead.status === crmStatus;
      const matchesSource = crmSource === "all" || lead.source === crmSource;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [crmLeads, crmSearch, crmSource, crmStatus]);

  const copyTemplate = async (tpl: WhatsappTemplate) => {
    try {
      await navigator.clipboard.writeText(tpl.message);
      setCopiedId(tpl.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: "Copiado!", description: "Mensagem copiada para a área de transferência." });
    } catch (error: any) {
      toast({ title: "Não foi possível copiar", description: error?.message, variant: "destructive" });
    }
  };

  const refreshLogs = () => queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-logs"] });

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <CrmWhatsappHeader
        tab={tab}
        onNewTemplate={() => { setEditTemplate(null); setTemplateModalOpen(true); }}
        onNewFlow={() => { setEditFlow(null); setFlowModalOpen(true); }}
        onRefreshLogs={refreshLogs}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4 sm:max-w-lg">
          <TabsTrigger value="mensagens" className="gap-1.5 text-xs" data-testid="tab-mensagens">
            <Library className="h-3.5 w-3.5" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5 text-xs" data-testid="tab-kanban">
            <Users className="h-3.5 w-3.5" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="fluxos" className="gap-1.5 text-xs" data-testid="tab-fluxos">
            <Zap className="h-3.5 w-3.5" />
            Fluxos
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs" data-testid="tab-logs">
            <ClipboardList className="h-3.5 w-3.5" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mensagens" className="mt-4 space-y-4">
          <TemplateLibrary
            templates={filteredTemplates}
            isLoading={templatesLoading}
            categoryFilter={categoryFilter}
            copiedId={copiedId}
            onCategoryChange={setCategoryFilter}
            onCreate={() => { setEditTemplate(null); setTemplateModalOpen(true); }}
            onEdit={template => { setEditTemplate(template); setTemplateModalOpen(true); }}
            onDelete={template => deleteTemplateMutation.mutate(template.id)}
            onCopy={copyTemplate}
            onSend={openSendTemplate}
          />
        </TabsContent>

        <TabsContent value="kanban" className="mt-4 space-y-4">
          <CrmFilters
            search={crmSearch}
            status={crmStatus}
            source={crmSource}
            sources={crmSources}
            onSearchChange={setCrmSearch}
            onStatusChange={setCrmStatus}
            onSourceChange={setCrmSource}
          />
          <CrmLeadList
            leads={filteredCrmLeads}
            clients={clientsList}
            logs={logsList}
            isLoading={leadsLoading || clientsLoading || jobsLoading || workOrdersLoading || warrantiesLoading || npsLoading || maintenanceLoading}
            onContactLead={openSendLead}
          />
          <CrmNextActions leads={filteredCrmLeads} isLoading={leadsLoading || jobsLoading || workOrdersLoading || warrantiesLoading || npsLoading || maintenanceLoading} onContactLead={openSendLead} />
          <CrmPipelineBoard leads={filteredCrmLeads} isLoading={leadsLoading || jobsLoading || workOrdersLoading || warrantiesLoading || npsLoading || maintenanceLoading} onContactLead={openSendLead} />
        </TabsContent>

        <TabsContent value="fluxos" className="mt-4">
          <FlowLibrary
            flows={sortedFlows}
            isLoading={flowsLoading}
            onCreate={() => { setEditFlow(null); setFlowModalOpen(true); }}
            onEdit={flow => { setEditFlow(flow); setFlowModalOpen(true); }}
            onDelete={flow => deleteFlowMutation.mutate(flow.id)}
            onSend={openSend}
            onSendButton={openSendButton}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <CrmContactHistory logs={logsList} isLoading={logsLoading} onRefresh={refreshLogs} />
        </TabsContent>
      </Tabs>

      <TemplateModal open={templateModalOpen} onClose={() => { setTemplateModalOpen(false); setEditTemplate(null); }} template={editTemplate} />
      <FlowModal open={flowModalOpen} onClose={() => { setFlowModalOpen(false); setEditFlow(null); }} flow={editFlow} />
      <SendModal open={sendModalOpen} onClose={() => { setSendModalOpen(false); setSendTarget(null); }} target={sendTarget} />
    </div>
  );
}
