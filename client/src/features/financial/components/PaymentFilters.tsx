import { Search } from "lucide-react";

type PaymentFiltersProps = {
  search: string;
  status: string;
  method: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onMethodChange: (value: string) => void;
};

export function PaymentFilters({ search, status, method, onSearchChange, onStatusChange, onMethodChange }: PaymentFiltersProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <label className="flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-500 dark:border-slate-800 dark:bg-slate-900">
          <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            placeholder="Buscar cliente, método, status ou notas..."
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            data-testid="input-search-payment"
          />
        </label>

        <select
          value={status}
          onChange={event => onStatusChange(event.target.value)}
          className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="all">Todos os status</option>
          <option value="completed">Concluído</option>
          <option value="pending">Pendente</option>
          <option value="failed">Falhou</option>
        </select>

        <select
          value={method}
          onChange={event => onMethodChange(event.target.value)}
          className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="all">Todos os métodos</option>
          <option value="transfer">Transferência</option>
          <option value="cash">Dinheiro</option>
          <option value="check">Cheque</option>
          <option value="card">Cartão</option>
          <option value="pix">PIX</option>
        </select>
      </div>
    </section>
  );
}
