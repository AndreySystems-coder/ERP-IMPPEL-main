import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Camera, Edit2, History, PackagePlus, PenLine, Search, Wrench, X } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { useCreateInventory, useInventory, useUpdateInventory } from "@/hooks/use-inventory";
import { asArray } from "@/lib/safeData";
import type { InventoryItem, Movement } from "@/features/inventory/types";
import type { Withdrawal } from "@/features/materials/types";
import { getMaterialReturnPolicyLabel, isReturnableMaterialItem, normalizeReturnCondition } from "@shared/materialReturnPolicy";
import { buildReturnableToolSummaryMap, type ReturnableWithdrawal } from "@shared/returnableToolSummary";

type ToolFormState = {
  name: string;
  type: "ferramenta" | "equipamento";
  unit: string;
  quantity: string;
  minStock: string;
  pricePerUnit: string;
};

const initialForm: ToolFormState = {
  name: "",
  type: "ferramenta",
  unit: "unid",
  quantity: "0",
  minStock: "0",
  pricePerUnit: "",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    const date = value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00`);
    return date.toLocaleDateString("pt-BR");
  } catch {
    return value;
  }
}

function attachmentPreview(value: string | null | undefined, label: string) {
  if (!value) return null;
  return (
    <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
      {label.includes("assinatura") ? <PenLine className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
      {label}
    </a>
  );
}

export default function ToolsAndEquipment() {
  const { data: inventoryData = [], isLoading } = useInventory();
  const { data: movementsData = [] } = useQuery<Movement[]>({ queryKey: ["/api/inventory-movements"] });
  const { data: withdrawalsData = [] } = useQuery<Withdrawal[]>({ queryKey: ["/api/material-withdrawals"] });
  const createInventory = useCreateInventory();
  const updateInventory = useUpdateInventory();

  const inventory = asArray<InventoryItem>(inventoryData);
  const movements = asArray<Movement>(movementsData);
  const withdrawals = asArray<Withdrawal>(withdrawalsData);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<ToolFormState>(initialForm);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  const toolSummaries = useMemo(
    () => buildReturnableToolSummaryMap(inventory, withdrawals as ReturnableWithdrawal[]),
    [inventory, withdrawals],
  );

  const tools = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return inventory
      .filter(item => isReturnableMaterialItem(item))
      .filter(item => !query || [item.name, item.type, item.unit].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [inventory, search]);

  const totals = tools.reduce((summary, item) => {
    const tool = toolSummaries.get(item.id);
    return {
      total: summary.total + (tool?.total || 0),
      available: summary.available + (tool?.available || 0),
      inField: summary.inField + (tool?.inField || 0),
      damaged: summary.damaged + (tool?.damaged || 0),
      lost: summary.lost + (tool?.lost || 0),
      maintenance: summary.maintenance + (tool?.maintenance || 0),
    };
  }, { total: 0, available: 0, inField: 0, damaged: 0, lost: 0, maintenance: 0 });

  const openNew = () => {
    setEditing(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      type: item.type === "equipamento" ? "equipamento" : "ferramenta",
      unit: item.unit || "unid",
      quantity: String(item.quantity ?? 0),
      minStock: String(item.minStock ?? 0),
      pricePerUnit: String(item.pricePerUnit ?? ""),
    });
    setModalOpen(true);
  };

  const submitTool = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      type: form.type,
      unit: form.unit.trim() || "unid",
      quantity: Number(form.quantity) || 0,
      minStock: Number(form.minStock) || 0,
      pricePerUnit: Number(form.pricePerUnit) || 0,
    };
    if (editing) await updateInventory.mutateAsync({ id: editing.id, ...payload });
    else await createInventory.mutateAsync(payload);
    setModalOpen(false);
  };

  const historyMovements = historyItem
    ? movements.filter(movement => Number(movement.inventoryId) === Number(historyItem.id)).sort((a, b) => String(b.date).localeCompare(String(a.date)))
    : [];
  const historyWithdrawals = historyItem
    ? withdrawals
      .filter(withdrawal => withdrawal.items?.some(item => Number(item.inventoryId) === Number(historyItem.id)))
      .sort((a, b) => String(b.createdAt || b.withdrawalDate || "").localeCompare(String(a.createdAt || a.withdrawalDate || "")))
    : [];

  const statCards = [
    ["Total", totals.total, "text-slate-900"],
    ["Disponível", totals.available, "text-emerald-700"],
    ["Em campo", totals.inField, "text-orange-700"],
    ["Danificado", totals.damaged, "text-amber-700"],
    ["Perdido", totals.lost, "text-red-700"],
    ["Manutenção", totals.maintenance, "text-blue-700"],
  ] as const;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-900">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ferramentas e Equipamentos</h1>
            <p className="mt-1 text-sm text-slate-500">Visualização operacional dos itens retornáveis usando Estoque e Controle de Materiais.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openNew}><PackagePlus className="mr-2 h-4 w-4" />Adicionar ferramenta</Button>
          <Link href="/controle-materiais" className="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Registrar retirada/devolução
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {statCards.map(([label, value, className]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${className}`}>{value}</p>
          </Card>
        ))}
      </section>

      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar ferramenta, equipamento ou categoria..."
            className="h-10 w-full rounded-md border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-slate-400"
            data-testid="input-search-tools"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-4">Ferramenta</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-center">Total</th>
                <th className="p-4 text-center">Disponível</th>
                <th className="p-4 text-center">Em campo</th>
                <th className="p-4 text-center">Danificado</th>
                <th className="p-4 text-center">Perdido</th>
                <th className="p-4 text-center">Manutenção</th>
                <th className="p-4 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && <tr><td colSpan={9} className="p-10 text-center text-slate-400">Carregando ferramentas...</td></tr>}
              {!isLoading && tools.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-slate-400">Nenhuma ferramenta retornável encontrada.</td></tr>}
              {tools.map(item => {
                const summary = toolSummaries.get(item.id);

                return (
                  <tr key={item.id} className="hover:bg-slate-50" data-testid={`row-tool-${item.id}`}>
                    <td className="p-4">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{getMaterialReturnPolicyLabel(item)}</p>
                    </td>
                    <td className="p-4 capitalize text-slate-600">{item.type || "ferramenta"}</td>
                    <td className="p-4 text-center font-bold text-slate-900">{summary?.total ?? item.quantity}</td>
                    <td className="p-4 text-center font-bold text-emerald-700">{summary?.available ?? item.quantity}</td>
                    <td className="p-4 text-center font-bold text-orange-700">{summary?.inField ?? 0}</td>
                    <td className="p-4 text-center font-bold text-amber-700">{summary?.damaged ?? 0}</td>
                    <td className="p-4 text-center font-bold text-red-700">{summary?.lost ?? 0}</td>
                    <td className="p-4 text-center font-bold text-blue-700">{summary?.maintenance ?? 0}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setHistoryItem(item)} title="Ver detalhes" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><History className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar ferramenta" : "Adicionar ferramenta"}>
        <form onSubmit={submitTool} className="space-y-4 py-2">
          <Input label="Nome *" required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Ex. Furadeira Bosch" />
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-semibold text-slate-700">
              Categoria
              <select value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value as ToolFormState["type"] }))} className="mt-1 w-full rounded-xl border-2 border-border bg-slate-50 px-4 py-2.5">
                <option value="ferramenta">Ferramenta</option>
                <option value="equipamento">Equipamento</option>
              </select>
            </label>
            <Input label="Unidade" value={form.unit} onChange={event => setForm(current => ({ ...current, unit: event.target.value }))} />
            <Input label="Quantidade inicial" type="number" min="0" value={form.quantity} onChange={event => setForm(current => ({ ...current, quantity: event.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Estoque mínimo" type="number" min="0" value={form.minStock} onChange={event => setForm(current => ({ ...current, minStock: event.target.value }))} />
            <Input label="Valor unitário" type="number" step="0.01" min="0" value={form.pricePerUnit} onChange={event => setForm(current => ({ ...current, pricePerUnit: event.target.value }))} />
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">Marcado como retornável automaticamente pela categoria ferramenta/equipamento.</div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={createInventory.isPending || updateInventory.isPending}>Salvar</Button>
          </div>
        </form>
      </Modal>

      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Histórico e anexos</h2>
                <p className="text-sm text-slate-500">{historyItem.name}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(historyItem)} title="Editar ferramenta" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><Edit2 className="h-5 w-5" /></button>
                <button onClick={() => setHistoryItem(null)} className="rounded-md p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="space-y-6 overflow-y-auto p-5">
              <section>
                <h3 className="mb-2 text-sm font-bold uppercase text-slate-500">Movimentações de estoque</h3>
                {historyMovements.length === 0 ? <p className="text-sm text-slate-400">Nenhuma movimentação registrada.</p> : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[620px] text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3 text-left">Data</th><th className="p-3 text-left">Tipo</th><th className="p-3 text-right">Qtd</th><th className="p-3 text-left">Observação</th></tr></thead>
                      <tbody className="divide-y">
                        {historyMovements.map(movement => <tr key={movement.id}><td className="p-3">{formatDate(movement.date)}</td><td className="p-3">{movement.type}</td><td className="p-3 text-right font-semibold">{movement.quantity}</td><td className="p-3 text-slate-600">{movement.notes || "-"}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-bold uppercase text-slate-500">Retiradas, devoluções, fotos e assinaturas</h3>
                {historyWithdrawals.length === 0 ? <p className="text-sm text-slate-400">Nenhuma retirada registrada.</p> : (
                  <div className="space-y-3">
                    {historyWithdrawals.map(withdrawal => {
                      const relatedItems = withdrawal.items?.filter(item => Number(item.inventoryId) === Number(historyItem.id)) || [];
                      return (
                        <article key={withdrawal.id} className="rounded-xl border border-slate-200 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">Retirada #{withdrawal.id} · {withdrawal.username}</p>
                              <p className="text-sm text-slate-500">{formatDate(withdrawal.withdrawalDate || withdrawal.createdAt)} · Status {withdrawal.status}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {attachmentPreview(withdrawal.withdrawalPhoto, "foto retirada")}
                              {attachmentPreview(withdrawal.withdrawalSignature, "assinatura retirada")}
                              {attachmentPreview(withdrawal.returnPhoto, "foto devolução")}
                              {attachmentPreview(withdrawal.returnSignature, "assinatura devolução")}
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {relatedItems.map(item => {
                              const condition = normalizeReturnCondition(item.condition);
                              return (
                                <div key={item.id || `${withdrawal.id}-${item.inventoryId}`} className="rounded-lg bg-slate-50 p-3 text-sm">
                                  <p className="font-semibold text-slate-800">{item.quantity} {item.unit || historyItem.unit || "unid"}</p>
                                  <p className="text-slate-500">Devolvido: {item.returnedQuantity || 0} · Condição: {condition}</p>
                                </div>
                              );
                            })}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
