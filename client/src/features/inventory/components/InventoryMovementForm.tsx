import { ArrowDownCircle, ArrowUpCircle, ClipboardList, Plus, X } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import type { BatchItem, InventoryItem } from "@/features/inventory/types";

export function InventoryMovementForm({
  items,
  batchItems,
  batchDate,
  batchNotes,
  isPending,
  onSubmit,
  onClose,
  onDateChange,
  onNotesChange,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onSelectProduct,
  onCloseDropdowns,
  formatDate,
}: {
  items: InventoryItem[];
  batchItems: BatchItem[];
  batchDate: string;
  batchNotes: string;
  isPending: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (index: number, field: keyof BatchItem, value: string | boolean) => void;
  onSelectProduct: (index: number, item: InventoryItem) => void;
  onCloseDropdowns: (exceptIndex?: number) => void;
  formatDate: (date: string) => string;
}) {
  const validRows = batchItems.filter(item => item.inventoryId && item.quantity);

  return (
    <Card className="p-6 border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" /> Lançamento Diário
        </h2>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Data do Lançamento *</label>
          <input type="date" value={batchDate} onChange={event => onDateChange(event.target.value)} required className="w-full sm:w-56 px-4 py-2.5 rounded-xl bg-white border-2 border-border focus:outline-none focus:border-primary transition-all text-sm" data-testid="input-batch-date" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-700">Produtos *</label>
            <button type="button" onClick={onAddRow} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline" data-testid="button-add-row">
              <Plus className="w-3 h-3" /> Adicionar produto
            </button>
          </div>

          <div className="hidden sm:grid grid-cols-[1fr_130px_90px_32px] gap-2 mb-1 px-1">
            <span className="text-xs font-semibold text-slate-500 uppercase">Produto</span>
            <span className="text-xs font-semibold text-slate-500 uppercase">Tipo</span>
            <span className="text-xs font-semibold text-slate-500 uppercase text-center">Qtd</span>
            <span />
          </div>

          <div className="space-y-2">
            {batchItems.map((row, idx) => {
              const filtered = items.filter(item =>
                item.name.toLowerCase().includes(row.searchText.toLowerCase()) && row.searchText.length > 0
              ).slice(0, 8);

              return (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_130px_90px_32px] gap-2 items-center" data-testid={`batch-row-${idx}`}>
                  <div className="relative">
                    <input
                      type="text"
                      value={row.searchText}
                      onChange={event => {
                        onUpdateRow(idx, "searchText", event.target.value);
                        onUpdateRow(idx, "inventoryId", "");
                        onUpdateRow(idx, "dropdownOpen", event.target.value.length > 0);
                      }}
                      onFocus={() => {
                        onCloseDropdowns(idx);
                        if (row.searchText.length > 0) onUpdateRow(idx, "dropdownOpen", true);
                      }}
                      onBlur={() => setTimeout(() => onUpdateRow(idx, "dropdownOpen", false), 150)}
                      placeholder="Digite o nome do produto..."
                      className={`w-full px-3 py-2 rounded-xl bg-white border-2 transition-all text-sm focus:outline-none ${row.inventoryId ? "border-green-400 bg-green-50" : "border-border focus:border-primary"}`}
                      data-testid={`input-product-search-${idx}`}
                    />
                    {row.inventoryId && (
                      <button type="button" onClick={() => { onUpdateRow(idx, "inventoryId", ""); onUpdateRow(idx, "searchText", ""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {row.dropdownOpen && filtered.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border-2 border-primary/30 rounded-xl shadow-lg overflow-hidden">
                        {filtered.map(item => (
                          <button key={item.id} type="button" onMouseDown={() => onSelectProduct(idx, item)} className="w-full text-left px-3 py-2.5 hover:bg-primary/5 transition-colors flex items-center justify-between gap-2 border-b border-slate-100 last:border-0" data-testid={`option-product-${item.id}-${idx}`}>
                            <span className="text-sm font-medium text-slate-900 truncate">{item.name}</span>
                            <span className="text-xs text-slate-400 shrink-0">{item.quantity} {item.unit || "unid"}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <button type="button" onClick={() => onUpdateRow(idx, "type", "ENTRADA")} className={`flex min-h-10 items-center justify-center gap-1 py-2 rounded-lg border-2 text-xs font-bold transition-all ${row.type === "ENTRADA" ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-400 hover:border-green-300"}`} data-testid={`button-type-entrada-${idx}`}>
                      <ArrowDownCircle className="w-3 h-3" /> Entrada
                    </button>
                    <button type="button" onClick={() => onUpdateRow(idx, "type", "SAÍDA")} className={`flex min-h-10 items-center justify-center gap-1 py-2 rounded-lg border-2 text-xs font-bold transition-all ${row.type === "SAÍDA" ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-400 hover:border-red-300"}`} data-testid={`button-type-saida-${idx}`}>
                      <ArrowUpCircle className="w-3 h-3" /> Saída
                    </button>
                  </div>

                  <input type="number" min="1" step="1" value={row.quantity} onChange={event => onUpdateRow(idx, "quantity", event.target.value)} placeholder="Qtd" className="w-full px-3 py-2 rounded-xl bg-white border-2 border-border focus:outline-none focus:border-primary transition-all text-sm text-center" data-testid={`input-qty-${idx}`} />

                  {batchItems.length > 1 ? (
                    <button type="button" onClick={() => onRemoveRow(idx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors justify-self-center" data-testid={`button-remove-row-${idx}`}>
                      <X className="w-4 h-4" />
                    </button>
                  ) : <div />}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Observação (opcional)</label>
          <input type="text" value={batchNotes} onChange={event => onNotesChange(event.target.value)} placeholder="Compra de materiais, uso em obra, ajuste de inventário..." className="w-full px-4 py-2.5 rounded-xl bg-white border-2 border-border focus:outline-none focus:border-primary transition-all text-sm" data-testid="input-batch-notes" />
        </div>

        {validRows.length > 0 && (
          <div className="rounded-xl p-3 text-sm border bg-slate-50 border-slate-200">
            <p className="font-semibold mb-2 text-slate-700">Resumo - {formatDate(batchDate)}</p>
            <div className="space-y-0.5">
              {validRows.map((row, idx) => {
                const item = items.find(inventoryItem => inventoryItem.id === Number(row.inventoryId));
                if (!item) return null;

                return (
                  <p key={idx} className="flex items-center gap-2 text-slate-700">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${row.type === "ENTRADA" ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"}`}>{row.type}</span>
                    <span className="font-medium">{item.name}</span>: {row.quantity} {item.unit || "unid"}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-primary/20">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isPending} data-testid="button-submit-batch">
            <ClipboardList className="w-4 h-4 mr-2" />
            Registrar {validRows.length} item(ns)
          </Button>
        </div>
      </form>
    </Card>
  );
}
