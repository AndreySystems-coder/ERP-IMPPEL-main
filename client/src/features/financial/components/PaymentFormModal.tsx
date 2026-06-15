import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PaymentFormState, PaymentJob, PaymentRecord } from "@/features/financial/types";
import { formatCurrency } from "@/features/financial/utils";
import { asArray } from "@/lib/safeData";

type PaymentFormModalProps = {
  open: boolean;
  payment: PaymentRecord | null;
  form: PaymentFormState;
  jobs: PaymentJob[];
  isSaving?: boolean;
  onClose: () => void;
  onChange: (form: PaymentFormState) => void;
  onSubmit: (event: FormEvent) => void;
};

export function PaymentFormModal({ open, payment, form, jobs, isSaving = false, onClose, onChange, onSubmit }: PaymentFormModalProps) {
  const setField = (field: keyof PaymentFormState, value: string) => onChange({ ...form, [field]: value });
  const jobsList = asArray<PaymentJob>(jobs);
  const selectedJob = jobsList.find(job => String(job.id) === form.jobId);
  const clientNames = Array.from(new Set(jobsList.map(job => job.clientName).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const clientJobs = form.clientName ? jobsList.filter(job => job.clientName === form.clientName) : jobsList;
  const getJobAmount = (job: PaymentJob) => Number((job as any).realPriceSold || (job as any).totalPrice || (job as any).finalPrice || 0);
  const setJob = (jobId: string) => {
    const job = jobsList.find(item => String(item.id) === jobId);
    onChange({
      ...form,
      jobId,
      clientName: job?.clientName || form.clientName,
      amount: job ? String(getJobAmount(job)) : form.amount,
    });
  };
  const setClient = (clientName: string) => {
    const matches = jobsList.filter(job => job.clientName === clientName);
    const firstJob = matches.length === 1 ? matches[0] : undefined;
    onChange({
      ...form,
      clientName,
      jobId: firstJob ? String(firstJob.id) : "",
      amount: firstJob ? String(getJobAmount(firstJob)) : "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-xl overflow-y-auto rounded-xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{payment ? "Editar pagamento" : "Novo pagamento"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <select
                value={form.clientName}
                onChange={event => setClient(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                data-testid="select-payment-client"
              >
                <option value="">Selecionar cliente</option>
                {clientNames.map(clientName => (
                  <option key={clientName} value={clientName}>{clientName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Orçamento vinculado *</Label>
              <select
                value={form.jobId}
                onChange={event => setJob(event.target.value)}
                required
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                data-testid="select-job"
              >
                <option value="">Selecione um orçamento</option>
                {clientJobs.map(job => (
                  <option key={job.id} value={String(job.id)}>
                    #{job.id} - {job.clientName} - {formatCurrency(getJobAmount(job))}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedJob ? (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Orçamento #{selectedJob.id} selecionado para {selectedJob.clientName}. Valor sugerido: {formatCurrency(getJobAmount(selectedJob))}.
            </div>
          ) : form.clientName ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Cliente selecionado. Escolha um orçamento da lista para manter o pagamento com referência.
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Selecione um orçamento para preencher cliente e valor automaticamente, ou selecione um cliente para ver os orçamentos disponíveis.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Valor *</Label>
              <Input required type="number" min="0" step="0.01" value={form.amount} onChange={event => setField("amount", event.target.value)} className="min-h-11" data-testid="input-amount" />
            </div>
            <div className="space-y-1.5">
              <Label>Método de pagamento *</Label>
              <select
                value={form.paymentMethod}
                onChange={event => setField("paymentMethod", event.target.value)}
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                data-testid="select-method"
              >
                <option value="transfer">Transferência</option>
                <option value="cash">Dinheiro</option>
                <option value="check">Cheque</option>
                <option value="card">Cartão</option>
                <option value="pix">PIX</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              value={form.status}
              onChange={event => setField("status", event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              data-testid="select-status"
            >
              <option value="completed">Concluído</option>
              <option value="pending">Pendente</option>
              <option value="failed">Falhou</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={event => setField("notes", event.target.value)} placeholder="Observações..." className="min-h-24 resize-none" data-testid="input-notes" />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSaving} className="bg-blue-700 text-white hover:bg-blue-800" data-testid="button-submit">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {payment ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
