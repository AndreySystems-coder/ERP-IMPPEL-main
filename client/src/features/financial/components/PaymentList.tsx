import { Edit2, Loader2, ReceiptText, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PaymentRecord } from "@/features/financial/types";
import { formatCurrency, formatDate, paymentMethodLabels, paymentStatusClasses, paymentStatusLabels } from "@/features/financial/utils";
import { asArray } from "@/lib/safeData";

type PaymentListProps = {
  payments: PaymentRecord[];
  isLoading?: boolean;
  onEdit: (payment: PaymentRecord) => void;
  onDelete: (payment: PaymentRecord) => void;
};

export function PaymentList({ payments, isLoading = false, onEdit, onDelete }: PaymentListProps) {
  const paymentsList = asArray<PaymentRecord>(payments);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Pagamentos registrados</h2>
        <p className="text-sm text-slate-500">{paymentsList.length} pagamento(s) na visualização atual</p>
      </div>

      {isLoading ? (
        <div className="space-y-3 p-4">
          {[1, 2, 3].map(item => <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />)}
        </div>
      ) : paymentsList.length === 0 ? (
        <div className="py-14 text-center text-slate-400">
          <ReceiptText className="mx-auto mb-3 h-11 w-11 opacity-40" />
          <p className="font-medium text-slate-500 dark:text-slate-300">Nenhum pagamento encontrado</p>
          <p className="mt-1 text-sm">Ajuste os filtros ou registre um novo pagamento.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 p-4 lg:hidden">
            {paymentsList.map(payment => <PaymentCard key={payment.id} payment={payment} onEdit={onEdit} onDelete={onDelete} />)}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
                  <th className="px-5 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Valor</th>
                  <th className="px-4 py-3 text-left">Método</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paymentsList.map(payment => (
                  <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60" data-testid={`row-payment-${payment.id}`}>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{payment.clientName}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(payment.date)}</td>
                    <td className="px-4 py-3"><PaymentStatusBadge status={payment.status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(payment)} data-testid={`button-edit-payment-${payment.id}`}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <DeletePaymentButton payment={payment} onDelete={onDelete} />
                      </div>
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
          Carregando pagamentos...
        </div>
      )}
    </section>
  );
}

function PaymentCard({ payment, onEdit, onDelete }: { payment: PaymentRecord; onEdit: (payment: PaymentRecord) => void; onDelete: (payment: PaymentRecord) => void }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60" data-testid={`row-payment-${payment.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{payment.clientName}</h3>
          <p className="mt-1 text-xs text-slate-500">{paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod} · {formatDate(payment.date)}</p>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>
      <p className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(payment.amount)}</p>
      {payment.notes && <p className="mt-2 line-clamp-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500 dark:bg-slate-950">{payment.notes}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(payment)} className="min-h-10 gap-2">
          <Edit2 className="h-4 w-4" />
          Editar
        </Button>
        <DeletePaymentButton payment={payment} onDelete={onDelete} fullWidth />
      </div>
    </article>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`border-0 text-xs ${paymentStatusClasses[status] || paymentStatusClasses.pending}`}>
      {paymentStatusLabels[status] || status}
    </Badge>
  );
}

function DeletePaymentButton({ payment, onDelete, fullWidth = false }: { payment: PaymentRecord; onDelete: (payment: PaymentRecord) => void; fullWidth?: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={fullWidth ? "outline" : "ghost"} size="sm" className={`${fullWidth ? "min-h-10 gap-2" : ""} text-red-600 hover:text-red-700`} data-testid={`button-delete-payment-${payment.id}`}>
          <Trash2 className="h-4 w-4" />
          {fullWidth ? "Remover" : null}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[calc(100vw-1.5rem)] rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Remover pagamento?</AlertDialogTitle>
          <AlertDialogDescription>
            O pagamento de {formatCurrency(payment.amount)} para {payment.clientName} será removido. Essa ação mantém os endpoints atuais, mas atualiza a lista após concluir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => onDelete(payment)} className="bg-red-600 text-white hover:bg-red-700">
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
