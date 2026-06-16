import { Briefcase, Edit2, FileText, Map, Tag, Trash2 } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

import { Button } from "@/components/Button";
import { evaluateMargin, calculateTotalCost, getCombinedRecommendation } from "@shared/marginEngine";

interface QuotesListProps {
  jobs: any[];
  jobsWithScores: any[];
  services: any[];
  costConfig: any;
  jobStatusConfigs: any[];
  workOrders?: any[];
  statusColors: Record<string, string>;
  onStatusChange: (job: any, status: string) => void;
  onSendWhatsApp: (job: any) => void;
  onGeneratePdf: (job: any) => void;
  onEdit: (job: any) => void;
  onDelete: (jobId: number) => void;
  privacyMaskEnabled?: boolean;
  maskText?: (value: unknown, fallback?: string) => string;
  maskMoney?: (value: unknown) => string;
  maskNumber?: (value: unknown, suffix?: string) => string;
}

function formatQuoteNumber(job: any) {
  return String(job.orcamentoNumero ?? job.id).padStart(4, "0");
}

function formatMoney(value: number | null | undefined) {
  return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getLinkedWorkOrders(job: any, workOrders: any[] = []) {
  return workOrders.filter(workOrder => Number(workOrder.jobId) === Number(job.id));
}

function WorkOrderLinkBadge({ job, workOrders = [] }: { job: any; workOrders?: any[] }) {
  const linkedWorkOrders = getLinkedWorkOrders(job, workOrders);
  if (linkedWorkOrders.length === 0) return null;
  const latest = linkedWorkOrders[0];

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
      <Briefcase className="h-3 w-3" />
      OS #{latest.id}{linkedWorkOrders.length > 1 ? ` +${linkedWorkOrders.length - 1}` : ""}
    </span>
  );
}

function RecommendationBadge({ job, jobsWithScores, services, costConfig }: Pick<QuotesListProps, "jobsWithScores" | "services" | "costConfig"> & { job: any }) {
  if (!costConfig) return <span className="text-slate-400 text-xs">-</span>;

  const svc = services.find((s: any) => s.name === job.serviceType);
  const jobScore = jobsWithScores.find((j: any) => j.id === job.id);

  if (!svc || !job.realPriceSold) {
    if (!jobScore) return <span className="text-slate-400 text-xs">-</span>;
    const colors: Record<string, string> = {
      ACEITAR: "bg-emerald-100 text-emerald-700",
      ORGANIZAR: "bg-blue-100 text-blue-700",
      RECUSAR: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[jobScore.recommendation] || "bg-slate-100 text-slate-600"}`}>
        {jobScore.recommendation}
      </span>
    );
  }

  const calc = calculateTotalCost(
    {
      squareMeters: job.squareMeters || 0,
      distanceKm: 0,
      serviceMaterialCostPerM2: svc.materialConsumptionPerM2,
      serviceLaborCostPerM2: svc.laborCostPerM2,
      serviceTransportCostPerM2: svc.transportCostPerM2,
    },
    costConfig,
  );
  const margin = evaluateMargin(job.realPriceSold, calc.totalCost, costConfig);

  if (jobScore) {
    const combined = getCombinedRecommendation(jobScore.recommendation, margin.status, jobScore.priority);
    const colors: Record<string, string> = {
      green: "bg-emerald-100 text-emerald-700",
      yellow: "bg-amber-100 text-amber-700",
      blue: "bg-blue-100 text-blue-700",
      red: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[combined.color] || "bg-slate-100 text-slate-600"}`} title={combined.reason}>
        {combined.recommendation}
      </span>
    );
  }

  const colors: Record<string, string> = {
    ACEITAR: "bg-emerald-100 text-emerald-700",
    ALERTA: "bg-amber-100 text-amber-700",
    RECUSAR: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[margin.status] || "bg-slate-100 text-slate-600"}`}>
      {margin.status}
    </span>
  );
}

function MarginBadge({ job, services, costConfig }: Pick<QuotesListProps, "services" | "costConfig"> & { job: any }) {
  if (!costConfig || !job.realPriceSold) return null;
  const svc = services.find((s: any) => s.name === job.serviceType);
  if (!svc) return null;

  const cost = (svc.materialConsumptionPerM2 + svc.laborCostPerM2 + svc.transportCostPerM2) * job.squareMeters;
  if (!cost) return null;

  const margin = evaluateMargin(job.realPriceSold, cost, costConfig);
  const color =
    margin.status === "ACEITAR"
      ? "bg-emerald-100 text-emerald-700"
      : margin.status === "ALERTA"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";

  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{(margin.marginPercent * 100).toFixed(0)}%</span>;
}

function QuoteActions({
  job,
  onSendWhatsApp,
  onGeneratePdf,
  onEdit,
  onDelete,
  compact = true,
}: Pick<QuotesListProps, "onSendWhatsApp" | "onGeneratePdf" | "onEdit" | "onDelete"> & { job: any; compact?: boolean }) {
  if (!compact) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-10 justify-center border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
          onClick={() => onSendWhatsApp(job)}
          title="Enviar orçamento via WhatsApp"
          data-testid={`button-whatsapp-${job.id}`}
        >
          <SiWhatsapp className="mr-2 h-4 w-4" /> WhatsApp
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-10 justify-center border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          onClick={() => onGeneratePdf(job)}
          title="Gerar PDF do orçamento"
          data-testid={`button-pdf-${job.id}`}
        >
          <FileText className="mr-2 h-4 w-4" /> PDF
        </Button>
        <Button variant="outline" size="sm" className="h-10 justify-center" onClick={() => onEdit(job)} data-testid={`button-edit-job-${job.id}`}>
          <Edit2 className="mr-2 h-4 w-4" /> Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-10 justify-center border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => onDelete(job.id)}
          data-testid={`button-delete-job-${job.id}`}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-green-600 hover:text-green-700 hover:bg-green-50"
        onClick={() => onSendWhatsApp(job)}
        title="Enviar orçamento via WhatsApp"
        data-testid={`button-whatsapp-${job.id}`}
      >
        <SiWhatsapp className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
        onClick={() => onGeneratePdf(job)}
        title="Gerar PDF do orçamento"
        data-testid={`button-pdf-${job.id}`}
      >
        <FileText className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onEdit(job)} data-testid={`button-edit-job-${job.id}`}>
        <Edit2 className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-500 hover:text-red-700 hover:bg-red-50"
        onClick={() => onDelete(job.id)}
        data-testid={`button-delete-job-${job.id}`}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function QuotesList({
  jobs,
  jobsWithScores,
  services,
  costConfig,
  jobStatusConfigs,
  workOrders = [],
  statusColors,
  onStatusChange,
  onSendWhatsApp,
  onGeneratePdf,
  onEdit,
  onDelete,
  privacyMaskEnabled = false,
  maskText = (value, fallback = "—") => String(value ?? "") || fallback,
  maskMoney = (value) => formatMoney(Number(value || 0)),
  maskNumber = (value, suffix = "") => `${value ?? 0}${suffix ? ` ${suffix}` : ""}`,
}: QuotesListProps) {
  const statusOptions =
    jobStatusConfigs.length > 0
      ? jobStatusConfigs.map((status) => status.name)
      : ["Lead", "Estimando", "Aprovado", "Agendada", "Em Progresso", "Concluída", "Faturada"];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {jobs.map((job) => (
          <article key={job.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-bold text-slate-900">{maskText(job.clientName, "Cliente ••••")}</h3>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    #{formatQuoteNumber(job)}
                  </span>
                  <WorkOrderLinkBadge job={job} workOrders={workOrders} />
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <Tag className="h-3.5 w-3.5" />
                  <span className="truncate">{maskText(job.serviceType, "Serviço ••••")}</span>
                </p>
              </div>
              <RecommendationBadge job={job} jobsWithScores={jobsWithScores} services={services} costConfig={costConfig} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium text-slate-500">Área</p>
                <p className="font-semibold text-slate-800">{maskNumber(job.squareMeters || 0, "m²")}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium text-slate-500">Valor vendido</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800">{maskMoney(job.realPriceSold)}</p>
                  {!privacyMaskEnabled && <MarginBadge job={job} services={services} costConfig={costConfig} />}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <select
                value={job.status}
                onChange={(event) => onStatusChange(job, event.target.value)}
                className={`w-full min-w-0 rounded-lg border-0 px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 ${statusColors[job.status] || "bg-slate-100"}`}
                data-testid={`select-status-${job.id}`}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <QuoteActions job={job} onSendWhatsApp={onSendWhatsApp} onGeneratePdf={onGeneratePdf} onEdit={onEdit} onDelete={onDelete} compact={false} />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-sm font-semibold uppercase text-slate-500">
                <th className="p-4 pl-6">Cliente / Serviço</th>
                <th className="p-4">Tamanho</th>
                <th className="p-4">Preço vendido</th>
                <th className="p-4">Recomendação</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-bold text-slate-900">{maskText(job.clientName, "Cliente ••••")}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        #{formatQuoteNumber(job)}
                      </span>
                      <WorkOrderLinkBadge job={job} workOrders={workOrders} />
                    </div>
                    <div className="mt-1 flex items-center text-sm text-slate-500">
                      <Tag className="mr-1.5 h-3.5 w-3.5" /> {maskText(job.serviceType, "Serviço ••••")}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center font-medium text-slate-700">
                      <Map className="mr-2 h-4 w-4 text-slate-400" />
                      {maskNumber(job.squareMeters || 0, "m²")}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{maskMoney(job.realPriceSold)}</span>
                      {!privacyMaskEnabled && <MarginBadge job={job} services={services} costConfig={costConfig} />}
                    </div>
                  </td>
                  <td className="p-4">
                    <RecommendationBadge job={job} jobsWithScores={jobsWithScores} services={services} costConfig={costConfig} />
                  </td>
                  <td className="p-4">
                    <select
                      value={job.status}
                      onChange={(event) => onStatusChange(job, event.target.value)}
                      className={`cursor-pointer rounded-full border-0 px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 ${statusColors[job.status] || "bg-slate-100"}`}
                      data-testid={`select-status-${job.id}`}
                      title="Alterar status do orçamento"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <QuoteActions job={job} onSendWhatsApp={onSendWhatsApp} onGeneratePdf={onGeneratePdf} onEdit={onEdit} onDelete={onDelete} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
