import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TransactionFormState } from "@/features/financial/types";

type TransactionFormModalProps = {
  open: boolean;
  form: TransactionFormState;
  isSaving?: boolean;
  onClose: () => void;
  onChange: (form: TransactionFormState) => void;
  onSubmit: (event: FormEvent) => void;
};

export function TransactionFormModal({ open, form, isSaving = false, onClose, onChange, onSubmit }: TransactionFormModalProps) {
  const setField = (field: keyof TransactionFormState, value: string) => onChange({ ...form, [field]: value });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto rounded-xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Nova transação</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setField("type", "inflow")}
              className={`min-h-10 rounded-lg text-sm font-semibold transition-all ${form.type === "inflow" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-800" : "text-slate-500"}`}
            >
              Entrada
            </button>
            <button
              type="button"
              onClick={() => setField("type", "outflow")}
              className={`min-h-10 rounded-lg text-sm font-semibold transition-all ${form.type === "outflow" ? "bg-white text-red-700 shadow-sm dark:bg-slate-800" : "text-slate-500"}`}
            >
              Saída
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição *</Label>
            <Input required value={form.description} onChange={event => setField("description", event.target.value)} placeholder="Ex: Pagamento do cliente" className="min-h-11" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Input required value={form.category} onChange={event => setField("category", event.target.value)} placeholder="Ex: Vendas, materiais" className="min-h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$) *</Label>
              <Input required type="number" min="0" step="0.01" value={form.amount} onChange={event => setField("amount", event.target.value)} className="min-h-11" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={event => setField("status", event.target.value)}
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="planned">Previsto</option>
                <option value="pending">Pendente</option>
                <option value="partial">Parcialmente pago</option>
                <option value="paid">Pago</option>
                <option value="received">Recebido</option>
                <option value="overdue">Atrasado</option>
                <option value="canceled">Cancelado</option>
                <option value="realized">Realizado</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Input value={form.paymentMethod} onChange={event => setField("paymentMethod", event.target.value)} placeholder="PIX, cartão, boleto..." className="min-h-11" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Competência</Label>
              <Input type="date" value={form.competenceDate} onChange={event => setField("competenceDate", event.target.value)} className="min-h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento</Label>
              <Input type="date" value={form.dueDate} onChange={event => setField("dueDate", event.target.value)} className="min-h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Pago/recebido em</Label>
              <Input type="date" value={form.paidAt} onChange={event => setField("paidAt", event.target.value)} className="min-h-11" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Input value={form.clientName} onChange={event => setField("clientName", event.target.value)} placeholder="Opcional" className="min-h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <Input value={form.supplierName} onChange={event => setField("supplierName", event.target.value)} placeholder="Opcional" className="min-h-11" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input value={form.notes} onChange={event => setField("notes", event.target.value)} placeholder="Decisões, parcela, recorrência ou conferência" className="min-h-11" />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSaving} className="bg-blue-700 text-white hover:bg-blue-800">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar transação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
