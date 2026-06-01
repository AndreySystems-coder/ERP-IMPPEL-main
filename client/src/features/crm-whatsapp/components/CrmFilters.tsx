import { Search } from "lucide-react";

import { CRM_STATUS_COLUMNS } from "@/features/crm-whatsapp/constants";

type CrmFiltersProps = {
  search: string;
  status: string;
  source: string;
  sources: string[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSourceChange: (value: string) => void;
};

export function CrmFilters({ search, status, source, sources, onSearchChange, onStatusChange, onSourceChange }: CrmFiltersProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <label className="flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-500 dark:border-slate-800 dark:bg-slate-900">
          <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            placeholder="Buscar lead, telefone ou observação..."
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            data-testid="input-crm-search"
          />
        </label>

        <select
          value={status}
          onChange={event => onStatusChange(event.target.value)}
          className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          data-testid="select-crm-status"
        >
          <option value="all">Todos os status</option>
          {CRM_STATUS_COLUMNS.map(column => <option key={column.id} value={column.id}>{column.label}</option>)}
        </select>

        <select
          value={source}
          onChange={event => onSourceChange(event.target.value)}
          className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          data-testid="select-crm-source"
        >
          <option value="all">Todas as origens</option>
          {sources.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
    </section>
  );
}
