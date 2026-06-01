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
