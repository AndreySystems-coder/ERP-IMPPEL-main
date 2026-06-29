import { AlertTriangle, Edit2, History, Package, Search, Trash2 } from "lucide-react";

import { Card } from "@/components/Card";
import type { InventoryItem } from "@/features/inventory/types";
import { isReturnableMaterialItem } from "@shared/materialReturnPolicy";

function ReturnPolicyBadge({ item }: { item: InventoryItem }) {
  const isReturnable = isReturnableMaterialItem(item);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${isReturnable ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
      {isReturnable ? "Retornavel" : "Consumivel"}
    </span>
  );
}

export function InventoryProductList({
  items,
  search,
  isLoading,
  onSearchChange,
  onHistory,
  onEdit,
  onDelete,
}: {
  items: InventoryItem[];
  search: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onHistory: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}) {
  return (
    <>
      <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm max-w-md focus-within:border-primary transition-all">
        <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
        <input
          type="text"
          placeholder="Pesquisar produto..."
          className="w-full bg-transparent border-none focus:outline-none text-slate-900"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          data-testid="input-search-inventory"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y divide-slate-100 sm:hidden">
          {isLoading && <div className="p-8 text-center text-slate-400">Carregando produtos...</div>}
          {!isLoading && items.length === 0 && (
            <div className="p-10 text-center text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              Nenhum item encontrado
            </div>
          )}
          {items.map(item => {
            const isLow = item.quantity <= item.minStock;
            const isEmpty = item.quantity <= 0;

            return (
              <div key={item.id} className="space-y-3 p-4" data-testid={`card-inventory-mobile-${item.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{item.type} / {item.unit || "unid"}</span>
                      <ReturnPolicyBadge item={item} />
                    </div>
                  </div>
                  {isEmpty ? (
                    <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Sem estoque</span>
                  ) : isLow ? (
                    <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Baixo</span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">OK</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="text-xs text-slate-500">Estoque atual</p>
                    <p className={`text-2xl font-bold ${isEmpty ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-800"}`}>{item.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Mínimo</p>
                    <p className="text-2xl font-bold text-slate-700">{item.minStock}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => onHistory(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Histórico</button>
                  <button onClick={() => onEdit(item)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Editar</button>
                  <button onClick={() => onDelete(item)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Excluir</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                <th className="p-4 pl-6">Produto</th>
                <th className="p-4">Unidade</th>
                <th className="p-4">Politica</th>
                <th className="p-4">Estoque Atual</th>
                <th className="p-4">Mín.</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right pr-6">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && <tr><td colSpan={7} className="text-center p-12 text-slate-400">Carregando...</td></tr>}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center p-12 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    Nenhum item encontrado
                  </td>
                </tr>
              )}
              {items.map(item => {
                const isLow = item.quantity <= item.minStock;
                const isEmpty = item.quantity <= 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors" data-testid={`row-inventory-${item.id}`}>
                    <td className="p-4 pl-6">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.type}</p>
                    </td>
                    <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">{item.unit || "unid"}</span></td>
                    <td className="p-4"><ReturnPolicyBadge item={item} /></td>
                    <td className="p-4"><span className={`text-2xl font-bold ${isEmpty ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-800"}`}>{item.quantity}</span></td>
                    <td className="p-4 text-slate-500">{item.minStock}</td>
                    <td className="p-4">
                      {isEmpty ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Sem estoque</span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Baixo</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">OK</span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button onClick={() => onHistory(item)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors mr-1" title="Histórico" data-testid={`button-history-${item.id}`}><History className="w-4 h-4" /></button>
                      <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors mr-1" data-testid={`button-edit-inventory-${item.id}`}><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => onDelete(item)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" data-testid={`button-delete-inventory-${item.id}`}><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
