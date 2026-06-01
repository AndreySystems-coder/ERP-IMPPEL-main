import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, FileText, CheckCircle, XCircle, GripVertical } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DeleteConfirmButton } from "@/features/financial/components/DeleteConfirmButton";

type PaymentCondition = {
  id: number;
  name: string;
  fullText: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
};

const DEFAULT_CONDITIONS = [
  { name: "À Vista", fullText: "À Vista: 5% de desconto (via PIX ou Transferência Bancária)." },
  { name: "Cartão de Crédito", fullText: "Cartão de Crédito: Em até 3x sem juros. Parcelamentos acima de 3x incidem juros da operadora." },
  { name: "Parcelamento via Boleto", fullText: "Parcelamento via Boleto: 50% de entrada no ato da aprovação e saldo em boleto (vencimento a combinar)." },
];

export default function PaymentConditions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: conditions = [], isLoading } = useQuery<PaymentCondition[]>({ queryKey: ["/api/payment-conditions"] });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentCondition | null>(null);
  const [name, setName] = useState("");
  const [fullText, setFullText] = useState("");
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/payment-conditions"] });

  const create = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/payment-conditions", data),
    onSuccess: () => { invalidate(); toast({ title: "Condição criada!" }); closeModal(); },
    onError: (err: any) => toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PUT", `/api/payment-conditions/${id}`, data),
    onSuccess: () => { invalidate(); toast({ title: "Condição atualizada!" }); closeModal(); },
    onError: (err: any) => toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/payment-conditions/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Condição removida." }); },
    onError: (err: any) => toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });
  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiRequest("PUT", `/api/payment-conditions/${id}`, { active }),
    onSuccess: () => invalidate(),
  });

  const openNew = () => {
    setEditing(null);
    setName("");
    setFullText("");
    setActive(true);
    setSortOrder((conditions as PaymentCondition[]).length * 10);
    setIsModalOpen(true);
  };

  const openEdit = (c: PaymentCondition) => {
    setEditing(c);
    setName(c.name);
    setFullText(c.fullText);
    setActive(c.active);
    setSortOrder(c.sortOrder ?? 0);
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !fullText.trim()) return;
    const payload = { name: name.trim(), fullText: fullText.trim(), active, sortOrder: Number(sortOrder) };
    if (editing) {
      update.mutate({ id: editing.id, ...payload });
    } else {
      create.mutate(payload);
    }
  };

  const seedDefaults = async () => {
    for (const def of DEFAULT_CONDITIONS) {
      await apiRequest("POST", "/api/payment-conditions", { name: def.name, fullText: def.fullText, active: true, sortOrder: 0 });
    }
    invalidate();
    toast({ title: "Condições padrão criadas!" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Condições de Pagamento
          </h1>
          <p className="text-slate-500 mt-1">
            Cadastre as condições que aparecerão no PDF dos orçamentos. Podem ser selecionadas individualmente por orçamento.
          </p>
        </div>
        <div className="flex gap-2">
          {(conditions as PaymentCondition[]).length === 0 && (
            <Button variant="outline" onClick={seedDefaults} data-testid="button-seed-defaults">
              <Plus className="w-4 h-4 mr-2" /> Criar padrões
            </Button>
          )}
          <Button onClick={openNew} data-testid="button-new-condition">
            <Plus className="w-4 h-4 mr-2" /> Nova Condição
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-start gap-3">
        <FileText className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Como funciona</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Crie quantas condições precisar (À Vista, Cartão, Boleto, etc.). Ao gerar um orçamento, você seleciona
            múltiplas condições e elas aparecem exatamente como cadastradas aqui na seção "CONDIÇÕES DE PAGAMENTO" do PDF.
          </p>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : (conditions as PaymentCondition[]).length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma condição cadastrada</p>
            <p className="text-sm mt-1">Clique em "Criar padrões" para adicionar as condições mais comuns automaticamente.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(conditions as PaymentCondition[]).map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                data-testid={`row-condition-${c.id}`}
              >
                <GripVertical className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    {c.active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle className="w-3 h-3" /> Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        <XCircle className="w-3 h-3" /> Inativa
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 font-mono whitespace-pre-wrap">
                    {c.fullText}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive.mutate({ id: c.id, active: !c.active })}
                    className={`px-2 py-1 text-xs rounded-lg border transition-colors font-medium ${c.active ? "text-amber-700 border-amber-200 hover:bg-amber-50" : "text-green-700 border-green-200 hover:bg-green-50"}`}
                    data-testid={`button-toggle-condition-${c.id}`}
                  >
                    {c.active ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    data-testid={`button-edit-condition-${c.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <DeleteConfirmButton
                    title="Remover condição de pagamento?"
                    description={`A condição "${c.name}" será removida da lista de opções para novos PDFs de orçamento.`}
                    testId={`button-delete-condition-${c.id}`}
                    onConfirm={() => remove.mutate(c.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? "Editar Condição de Pagamento" : "Nova Condição de Pagamento"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nome da Condição</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: À Vista, Cartão de Crédito, Parcelamento via Boleto"
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 transition-all"
              required
              data-testid="input-condition-name"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">
              Texto completo <span className="font-normal text-slate-400">(aparecerá exatamente assim no PDF)</span>
            </label>
            <textarea
              value={fullText}
              onChange={e => setFullText(e.target.value)}
              rows={4}
              placeholder="Ex: À Vista: 5% de desconto (via PIX ou Transferência Bancária)."
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 transition-all resize-none font-mono"
              required
              data-testid="input-condition-fulltext"
            />
            <p className="text-xs text-slate-400 mt-1">O texto será copiado para o PDF sem nenhuma alteração.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Ordem de exibição</label>
              <input
                type="number"
                value={sortOrder}
                onChange={e => setSortOrder(Number(e.target.value))}
                min={0}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 transition-all"
                data-testid="input-condition-sort"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                  data-testid="checkbox-condition-active"
                />
                <span className="text-sm font-semibold text-slate-700">Ativa</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          {fullText.trim() && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Prévia no PDF:</p>
              <p className="text-sm text-slate-700">{fullText}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" isLoading={create.isPending || update.isPending} className="flex-1" data-testid="button-save-condition">
              {editing ? "Salvar Alterações" : "Criar Condição"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
