import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, CreditCard, TrendingDown, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmButton } from "@/features/financial/components/DeleteConfirmButton";

type PaymentMethod = {
  id: number;
  name: string;
  discountPercent: number;
  active: boolean;
  notes?: string;
  createdAt?: string;
};

const apiRequest = async (method: string, path: string, body?: any) => {
  const res = await fetch(path, { method, body: body ? JSON.stringify(body) : undefined, headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(res.statusText);
  if (res.status === 204) return null;
  return res.json();
};

export default function PaymentMethods() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: methods = [], isLoading } = useQuery<PaymentMethod[]>({ queryKey: ["/api/payment-methods"] });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [name, setName] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/payment-methods", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] }); toast({ title: "Forma de pagamento criada!" }); setIsModalOpen(false); },
    onError: () => toast({ title: "Erro ao criar", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PUT", `/api/payment-methods/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] }); toast({ title: "Atualizado!" }); setIsModalOpen(false); },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/payment-methods/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] }); toast({ title: "Removido!" }); },
    onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
  });

  const openNew = () => {
    setEditing(null); setName(""); setDiscountPercent("0"); setActive(true); setNotes("");
    setIsModalOpen(true);
  };

  const openEdit = (pm: PaymentMethod) => {
    setEditing(pm); setName(pm.name); setDiscountPercent(pm.discountPercent.toString()); setActive(pm.active); setNotes(pm.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, discountPercent: Number(discountPercent), active, notes: notes || undefined };
    if (editing) updateMutation.mutate({ id: editing.id, ...payload });
    else createMutation.mutate(payload);
  };

  const discountVal = Number(discountPercent);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Formas de Pagamento</h1>
          <p className="text-slate-500 mt-1">Configure as formas de pagamento aceitas pela IMPPEL e seus ajustes de preço.</p>
        </div>
        <Button onClick={openNew} data-testid="button-add-pm">
          <Plus className="w-5 h-5 mr-2" /> Nova Forma
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{methods.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wider">Ativas</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{methods.filter(m => m.active).length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wider">Com Desconto</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{methods.filter(m => m.discountPercent < 0).length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Com Acréscimo</p>
          <p className="text-3xl font-bold text-amber-700 mt-1">{methods.filter(m => m.discountPercent > 0).length}</p>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                <th className="p-4 pl-6">Forma de Pagamento</th>
                <th className="p-4">Ajuste de Preço</th>
                <th className="p-4">Status</th>
                <th className="p-4">Observação</th>
                <th className="p-4 text-right pr-6">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && <tr><td colSpan={5} className="text-center p-12 text-slate-400">Carregando...</td></tr>}
              {!isLoading && methods.length === 0 && (
                <tr><td colSpan={5} className="text-center p-12 text-slate-400"><CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Nenhuma forma de pagamento cadastrada</p></td></tr>
              )}
              {methods.map(pm => (
                <tr key={pm.id} className="hover:bg-slate-50 transition-colors" data-testid={`row-pm-${pm.id}`}>
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-semibold text-slate-900">{pm.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {pm.discountPercent === 0 ? (
                      <span className="text-slate-400 text-xs font-medium">Sem ajuste</span>
                    ) : pm.discountPercent < 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                        <TrendingDown className="w-3.5 h-3.5" /> {Math.abs(pm.discountPercent)}% desconto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                        <TrendingUp className="w-3.5 h-3.5" /> +{pm.discountPercent}% acréscimo
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {pm.active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Ativo</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Inativo</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-500 text-xs max-w-[200px] truncate">{pm.notes || "—"}</td>
                  <td className="p-4 pr-6 text-right">
                    <button onClick={() => openEdit(pm)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors mr-1" data-testid={`button-edit-pm-${pm.id}`}><Edit2 className="w-4 h-4" /></button>
                    <DeleteConfirmButton
                      title="Remover forma de pagamento?"
                      description={`A forma "${pm.name}" será removida das opções disponíveis para novos orçamentos.`}
                      testId={`button-delete-pm-${pm.id}`}
                      onConfirm={() => deleteMutation.mutate(pm.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <Input label="Nome *" required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: À Vista, PIX, Cartão de Crédito" data-testid="input-pm-name" />

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Ajuste de Preço (%)</label>
            <p className="text-xs text-slate-400 mb-2">Negativo = desconto (ex: -5 para 5% de desconto). Positivo = acréscimo (ex: 3 para 3% a mais).</p>
            <input
              type="number"
              step="0.1"
              value={discountPercent}
              onChange={e => setDiscountPercent(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-border focus:outline-none focus:border-primary transition-all"
              data-testid="input-pm-discount"
            />
            {discountVal !== 0 && (
              <div className={`mt-2 text-xs font-semibold rounded-lg p-2 ${discountVal < 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                {discountVal < 0 ? `💚 Desconto de ${Math.abs(discountVal)}% — cliente paga menos` : `⚠️ Acréscimo de ${discountVal}% — cliente paga mais`}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Status</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setActive(true)} className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${active ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500 hover:border-green-300"}`} data-testid="button-pm-active">
                <CheckCircle className="w-4 h-4 inline mr-1" /> Ativo
              </button>
              <button type="button" onClick={() => setActive(false)} className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${!active ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 text-slate-500 hover:border-red-300"}`} data-testid="button-pm-inactive">
                <XCircle className="w-4 h-4 inline mr-1" /> Inativo
              </button>
            </div>
          </div>

          <Input label="Observação (opcional)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Desconto aprovado pelo gerente" data-testid="input-pm-notes" />

          <div className="pt-4 flex justify-end gap-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-pm">Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
