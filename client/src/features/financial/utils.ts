import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { PaymentRecord, TransactionFormState } from "@/features/financial/types";

export const paymentMethodLabels: Record<string, string> = {
  transfer: "Transferência",
  cash: "Dinheiro",
  check: "Cheque",
  card: "Cartão",
  pix: "PIX",
};

export const paymentStatusLabels: Record<string, string> = {
  completed: "Concluído",
  pending: "Pendente",
  failed: "Falhou",
};

export const paymentStatusClasses: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export function formatCurrency(value: number | null | undefined) {
  return (value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
}

export function getPaymentSearchText(payment: PaymentRecord) {
  return [
    payment.clientName,
    payment.paymentMethod,
    payment.status,
    payment.notes,
    payment.id,
    payment.jobId,
  ].filter(Boolean).join(" ").toLowerCase();
}

export function emptyTransactionForm(): TransactionFormState {
  return {
    type: "inflow",
    category: "",
    amount: "",
    description: "",
  };
}
