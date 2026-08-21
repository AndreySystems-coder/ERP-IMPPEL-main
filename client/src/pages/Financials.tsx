import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { DollarSign, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCreateTransaction, useTransactions } from "@/hooks/use-transactions";
import { FinancialSummaryCards } from "@/features/financial/components/FinancialSummaryCards";
import { TransactionFormModal } from "@/features/financial/components/TransactionFormModal";
import { TransactionHistory } from "@/features/financial/components/TransactionHistory";
import type { TransactionFormState } from "@/features/financial/types";
import { emptyTransactionForm, formatCurrency, isTransactionRealized } from "@/features/financial/utils";

export default function Financials() {
  const { toast } = useToast();
  const { data: transactions = [], isLoading } = useTransactions();
  const createTransaction = useCreateTransaction();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<TransactionFormState>(emptyTransactionForm());

  const totals = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const inSevenDays = new Date(startOfToday);
    inSevenDays.setDate(inSevenDays.getDate() + 7);
    const inThirtyDays = new Date(startOfToday);
    inThirtyDays.setDate(inThirtyDays.getDate() + 30);

    const realized = transactions.filter(tx => isTransactionRealized((tx as any).status));
    const inflows = realized.filter(tx => tx.type === "inflow").reduce((sum, tx) => sum + tx.amount, 0);
    const outflows = realized.filter(tx => tx.type === "outflow").reduce((sum, tx) => sum + tx.amount, 0);
    const upcoming = transactions.filter(tx => {
      if ((tx as any).status === "canceled") return false;
      const due = new Date((tx as any).dueDate || tx.date || new Date());
      return due >= startOfToday && due <= inSevenDays && !isTransactionRealized((tx as any).status);
    });
    const overdue = transactions.filter(tx => {
      if ((tx as any).status === "canceled" || isTransactionRealized((tx as any).status)) return false;
      const due = new Date((tx as any).dueDate || tx.date || new Date());
      return due < startOfToday;
    });
    const thirtyDayProjection = transactions.filter(tx => {
      if ((tx as any).status === "canceled") return false;
      const due = new Date((tx as any).dueDate || tx.date || new Date());
      return due <= inThirtyDays;
    }).reduce((sum, tx) => sum + (tx.type === "inflow" ? tx.amount : -tx.amount), 0);
    const upcomingPayables = upcoming.filter(tx => tx.type === "outflow").reduce((sum, tx) => sum + tx.amount, 0);
    const upcomingReceivables = upcoming.filter(tx => tx.type === "inflow").reduce((sum, tx) => sum + tx.amount, 0);

    return {
      inflows,
      outflows,
      balance: inflows - outflows,
      upcomingPayables,
      upcomingReceivables,
      overdueAmount: overdue.reduce((sum, tx) => sum + (tx.type === "inflow" ? tx.amount : -tx.amount), 0),
      overdueCount: overdue.length,
      realSevenDayBalance: inflows - outflows + upcomingReceivables - upcomingPayables,
      projectedThirtyDayBalance: thirtyDayProjection,
      weeklyResult: transactions.filter(tx => {
        const created = new Date(tx.date || new Date());
        const weekStart = new Date(startOfToday);
        weekStart.setDate(weekStart.getDate() - 6);
        return created >= weekStart && created <= now && isTransactionRealized((tx as any).status);
      }).reduce((sum, tx) => sum + (tx.type === "inflow" ? tx.amount : -tx.amount), 0),
    };
  }, [transactions]);

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(emptyTransactionForm());
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await createTransaction.mutateAsync({
        type: form.type,
        category: form.category.trim(),
        amount: Number(form.amount),
        description: form.description.trim(),
        status: form.status,
        competenceDate: form.competenceDate ? new Date(form.competenceDate) : undefined,
        dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
        paidAt: form.paidAt ? new Date(form.paidAt) : undefined,
        paymentMethod: form.paymentMethod.trim() || undefined,
        clientName: form.clientName.trim() || undefined,
        supplierName: form.supplierName.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast({ title: "Transação registrada!" });
      closeModal();
    } catch (error: any) {
      toast({ title: "Erro ao registrar transação", description: error?.message, variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            Financeiro
          </h1>
          <p className="mt-1 text-sm text-slate-500">Fluxo de caixa e histórico de transações da IMPPEL.</p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="min-h-10 gap-2 bg-blue-700 text-white hover:bg-blue-800">
          <Plus className="h-4 w-4" />
          Registrar transação
        </Button>
      </div>

      <FinancialSummaryCards
        inflows={totals.inflows}
        outflows={totals.outflows}
        balance={totals.balance}
        upcomingPayables={totals.upcomingPayables}
        upcomingReceivables={totals.upcomingReceivables}
        realSevenDayBalance={totals.realSevenDayBalance}
      />
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">Próximos 7 dias</p>
          <p className="mt-2 text-xs text-slate-500">Receber: {formatCurrency(totals.upcomingReceivables)}</p>
          <p className="text-xs text-slate-500">Pagar: {formatCurrency(totals.upcomingPayables)}</p>
          <p className="mt-3 text-lg font-bold text-slate-900">{formatCurrency(totals.realSevenDayBalance)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">Projeção 30 dias</p>
          <p className="mt-2 text-xs text-slate-500">Previsto e realizado acumulados no período</p>
          <p className={`mt-3 text-lg font-bold ${totals.projectedThirtyDayBalance < 0 ? "text-red-600" : "text-emerald-600"}`}>{formatCurrency(totals.projectedThirtyDayBalance)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">Resumo financeiro semanal</p>
          <p className="mt-2 text-xs text-slate-500">{totals.overdueCount} conta(s) vencida(s)</p>
          <p className="text-xs text-slate-500">Resultado da semana: {formatCurrency(totals.weeklyResult)}</p>
          <p className="mt-3 text-xs text-slate-500">A reunião continua sendo uma confirmação humana registrada nos lançamentos.</p>
        </div>
      </section>
      <TransactionHistory transactions={transactions} isLoading={isLoading} />

      <TransactionFormModal
        open={isModalOpen}
        form={form}
        isSaving={createTransaction.isPending}
        onClose={closeModal}
        onChange={setForm}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
