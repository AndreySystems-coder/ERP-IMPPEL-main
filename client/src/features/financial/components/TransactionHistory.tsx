import { ArrowDownRight, ArrowUpRight, Loader2, ReceiptText } from "lucide-react";

import type { FinancialTransaction } from "@/features/financial/types";
import { formatCurrency, formatDate } from "@/features/financial/utils";

type TransactionHistoryProps = {
  transactions: FinancialTransaction[];
  isLoading?: boolean;
};

export function TransactionHistory({ transactions, isLoading = false }: TransactionHistoryProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Histórico de transações</h2>
        <p className="text-sm text-slate-500">{transactions.length} lançamento(s) no fluxo de caixa</p>
      </div>

      {isLoading ? (
        <div className="space-y-3 p-4">
          {[1, 2, 3].map(item => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />)}
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-14 text-center text-slate-400">
          <ReceiptText className="mx-auto mb-3 h-11 w-11 opacity-40" />
          <p className="font-medium text-slate-500 dark:text-slate-300">Nenhuma transação registrada</p>
          <p className="mt-1 text-sm">Registre entradas e saídas para acompanhar o fluxo de caixa.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 p-4 md:hidden">
            {transactions.map(tx => <TransactionCard key={tx.id} transaction={tx} />)}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
                  <th className="p-4 pl-5">Data</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4 pr-5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                    <td className="p-4 pl-5 text-slate-600 dark:text-slate-300">{formatDate(tx.date)}</td>
                    <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{tx.description}</td>
                    <td className="p-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{tx.category}</span></td>
                    <td className={`p-4 pr-5 text-right font-bold ${tx.type === "inflow" ? "text-emerald-600" : "text-red-600"}`}>
                      {tx.type === "inflow" ? "+" : "-"} {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isLoading && (
        <div className="flex items-center justify-center pb-4 text-xs font-medium text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando transações...
        </div>
      )}
    </section>
  );
}

function TransactionCard({ transaction }: { transaction: FinancialTransaction }) {
  const isInflow = transaction.type === "inflow";

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{transaction.description}</h3>
          <p className="mt-1 text-xs text-slate-500">{formatDate(transaction.date)} · {transaction.category}</p>
        </div>
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isInflow ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
          {isInflow ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        </span>
      </div>
      <p className={`mt-3 text-lg font-bold ${isInflow ? "text-emerald-600" : "text-red-600"}`}>
        {isInflow ? "+" : "-"} {formatCurrency(transaction.amount)}
      </p>
    </article>
  );
}
