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
import { emptyTransactionForm } from "@/features/financial/utils";

export default function Financials() {
  const { toast } = useToast();
  const { data: transactions = [], isLoading } = useTransactions();
  const createTransaction = useCreateTransaction();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<TransactionFormState>(emptyTransactionForm());

  const totals = useMemo(() => {
    const inflows = transactions.filter(tx => tx.type === "inflow").reduce((sum, tx) => sum + tx.amount, 0);
    const outflows = transactions.filter(tx => tx.type === "outflow").reduce((sum, tx) => sum + tx.amount, 0);

    return {
      inflows,
      outflows,
      balance: inflows - outflows,
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

      <FinancialSummaryCards inflows={totals.inflows} outflows={totals.outflows} balance={totals.balance} />
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
