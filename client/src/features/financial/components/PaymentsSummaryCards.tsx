import { AlertCircle, CheckCircle2, Clock, DollarSign } from "lucide-react";

import type { PaymentRecord } from "@/features/financial/types";
import { formatCurrency } from "@/features/financial/utils";
import { asArray } from "@/lib/safeData";

type PaymentsSummaryCardsProps = {
  payments: PaymentRecord[];
};

export function PaymentsSummaryCards({ payments }: PaymentsSummaryCardsProps) {
  const paymentsList = asArray<PaymentRecord>(payments);
  const completed = paymentsList.filter(payment => payment.status === "completed");
  const pending = paymentsList.filter(payment => payment.status === "pending");
  const failed = paymentsList.filter(payment => payment.status === "failed");
  const totalReceived = completed.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard icon={DollarSign} label="Recebido" value={formatCurrency(totalReceived)} tone="navy" />
      <MetricCard icon={CheckCircle2} label="Concluídos" value={String(completed.length)} tone="green" />
      <MetricCard icon={Clock} label="Pendentes" value={String(pending.length)} tone="amber" />
      <MetricCard icon={AlertCircle} label="Falhos" value={String(failed.length)} tone="red" />
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof DollarSign; label: string; value: string; tone: "navy" | "green" | "amber" | "red" }) {
  const classes = {
    navy: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300",
    amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300",
    red: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${classes}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
