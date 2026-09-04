import { Briefcase, Tag } from "lucide-react";

import { KanbanBoard, type KanbanColumn } from "@/components/kanban/KanbanBoard";
import {
  MarginBadge,
  QuoteActions,
  RecommendationBadge,
  WorkOrderLinkBadge,
  formatMoney,
  formatQuoteNumber,
  type QuotesListProps,
} from "@/features/quotes/components/QuotesList";

const FALLBACK_STATUSES = ["Lead", "Estimando", "Aprovado", "Agendada", "Em Progresso", "Concluída", "Faturada"];

type QuotesBoardProps = Pick<
  QuotesListProps,
  "jobs" | "jobsWithScores" | "services" | "costConfig" | "jobStatusConfigs" | "workOrders" | "onStatusChange" | "onSendWhatsApp" | "onGeneratePdf" | "onEdit" | "onDelete"
>;

export function QuotesBoard({
  jobs,
  jobsWithScores,
  services,
  costConfig,
  jobStatusConfigs,
  workOrders = [],
  onStatusChange,
  onSendWhatsApp,
  onGeneratePdf,
  onEdit,
  onDelete,
}: QuotesBoardProps) {
  const statusNames = jobStatusConfigs.length > 0 ? jobStatusConfigs.map(status => status.name) : FALLBACK_STATUSES;
  const columns: KanbanColumn[] = statusNames.map(name => ({
    id: name,
    label: name,
    colorClassName: "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40",
  }));

  return (
    <KanbanBoard
      columns={columns}
      items={jobs}
      getItemId={job => job.id}
      getItemColumn={job => job.status}
      onDrop={(job, newStatus) => onStatusChange(job, newStatus)}
      emptyIcon={<Briefcase className="mx-auto mb-2 h-5 w-5 opacity-50" />}
      renderCard={job => (
        <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{job.clientName}</h3>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  #{formatQuoteNumber(job)}
                </span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <Tag className="h-3 w-3" />
                <span className="truncate">{job.serviceType}</span>
              </p>
            </div>
            <RecommendationBadge job={job} jobsWithScores={jobsWithScores} services={services} costConfig={costConfig} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <WorkOrderLinkBadge job={job} workOrders={workOrders} />
            <div className="ml-auto flex items-center gap-1.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(job.realPriceSold)}</span>
              <MarginBadge job={job} services={services} costConfig={costConfig} />
            </div>
          </div>
          <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
            <QuoteActions job={job} onSendWhatsApp={onSendWhatsApp} onGeneratePdf={onGeneratePdf} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </article>
      )}
    />
  );
}
