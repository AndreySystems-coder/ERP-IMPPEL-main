import { ArrowDownRight, ArrowUpRight, DollarSign } from "lucide-react";

import { formatCurrency } from "@/features/financial/utils";

type FinancialSummaryCardsProps = {
  inflows: number;
  outflows: number;
  balance: number;
};

export function FinancialSummaryCards({ inflows, outflows, balance }: FinancialSummaryCardsProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-white shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <DollarSign className="h-4 w-4" />
          Saldo atual
        </div>
        <p className="mt-3 text-3xl font-bold">{formatCurrency(balance)}</p>
        <p className="mt-1 text-xs text-slate-400">Entradas menos saídas registradas</p>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <ArrowUpRight className="h-4 w-4" />
          Total de entradas
        </div>
        <p className="mt-3 text-3xl font-bold text-emerald-900 dark:text-emerald-200">{formatCurrency(inflows)}</p>
        <p className="mt-1 text-xs text-emerald-700/70 dark:text-emerald-300/70">Receitas registradas no caixa</p>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm dark:border-red-900 dark:bg-red-950/20">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
          <ArrowDownRight className="h-4 w-4" />
          Total de saídas
        </div>
        <p className="mt-3 text-3xl font-bold text-red-900 dark:text-red-200">{formatCurrency(outflows)}</p>
        <p className="mt-1 text-xs text-red-700/70 dark:text-red-300/70">Despesas registradas no caixa</p>
      </div>
    </section>
  );
}
