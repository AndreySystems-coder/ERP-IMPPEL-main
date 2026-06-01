import { ChevronLeft, ChevronRight, ClipboardList, Edit2, FileDown, Plus, Search, Trash2, TrendingDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/Button";
import type { Movement } from "@/features/inventory/types";

export function InventoryMovementHistory({
  selectedYM,
  availableMonths,
  monthLabel,
  monthMovements,
  groupedByDay,
  movSearch,
  onMonthChange,
  onNavigateMonth,
  onSearchChange,
  onDownloadPdf,
  onNewMovement,
  onEditMovement,
  onDeleteMovement,
  formatDate,
  isDeleting,
}: {
  selectedYM: string;
  availableMonths: string[];
  monthLabel: (ym: string) => string;
  monthMovements: Movement[];
  groupedByDay: [string, Movement[]][];
  movSearch: string;
  onMonthChange: (value: string) => void;
  onNavigateMonth: (dir: number) => void;
  onSearchChange: (value: string) => void;
  onDownloadPdf: () => void;
  onNewMovement: () => void;
  onEditMovement: (movement: Movement) => void;
  onDeleteMovement: (movement: Movement) => void;
  formatDate: (date: string) => string;
  isDeleting: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => onNavigateMonth(-1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors" data-testid="button-prev-month">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <select
            value={selectedYM}
            onChange={event => onMonthChange(event.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:border-primary"
            data-testid="select-month"
          >
            {availableMonths.map(ym => (
              <option key={ym} value={ym}>{monthLabel(ym)}</option>
            ))}
          </select>
          <button onClick={() => onNavigateMonth(1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors" data-testid="button-next-month">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-sm text-slate-500 sm:ml-2">{monthMovements.length} lançamento(s)</span>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
          <Button variant="outline" onClick={onDownloadPdf} className="flex items-center gap-2" data-testid="button-download-pdf">
            <FileDown className="w-4 h-4" /> PDF {monthLabel(selectedYM)}
          </Button>
          <Button onClick={onNewMovement} data-testid="button-new-lancamento">
            <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
          </Button>
        </div>
      </div>

      {monthMovements.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wider">Entradas</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{monthMovements.filter(m => m.type === "ENTRADA").reduce((sum, movement) => sum + movement.quantity, 0)}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-xs text-red-600 font-semibold uppercase tracking-wider">Saídas</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{monthMovements.filter(m => m.type === "SAÍDA").reduce((sum, movement) => sum + movement.quantity, 0)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Registros</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{monthMovements.length}</p>
          </div>
        </div>
      )}

      <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm max-w-sm focus-within:border-primary transition-all">
        <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
        <input type="text" placeholder="Buscar no mês..." className="w-full bg-transparent border-none focus:outline-none text-slate-900 text-sm" value={movSearch} onChange={event => onSearchChange(event.target.value)} />
      </div>

      {groupedByDay.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ClipboardList className="w-14 h-14 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium">Nenhuma movimentação em {monthLabel(selectedYM)}</p>
          <p className="text-sm mt-1">Clique em "Novo Lançamento" para registrar entradas e saídas deste mês.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map(([date, dayMovs]) => {
            const entradas = dayMovs.filter(m => m.type === "ENTRADA").reduce((sum, movement) => sum + movement.quantity, 0);
            const saidas = dayMovs.filter(m => m.type === "SAÍDA").reduce((sum, movement) => sum + movement.quantity, 0);

            return (
              <div key={date} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-slate-800">{formatDate(date)}</p>
                    <span className="text-xs text-slate-400">{dayMovs.length} item(ns)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {entradas > 0 && <span className="font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">+{entradas} entrada(s)</span>}
                    {saidas > 0 && <span className="font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">-{saidas} saída(s)</span>}
                  </div>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-50">
                    {dayMovs.map(movement => (
                      <tr key={movement.id} className="hover:bg-slate-50 transition-colors group" data-testid={`row-movement-${movement.id}`}>
                        <td className="px-5 py-3 font-semibold text-slate-800">{movement.productName}</td>
                        <td className="px-4 py-3">
                          {movement.type === "ENTRADA" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><TrendingUp className="w-3 h-3" /> ENTRADA</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><TrendingDown className="w-3 h-3" /> SAÍDA</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{movement.quantity}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{movement.notes || ""}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onEditMovement(movement)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" title="Editar movimentação" data-testid={`button-edit-movement-${movement.id}`}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onDeleteMovement(movement)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Excluir movimentação" data-testid={`button-delete-movement-${movement.id}`} disabled={isDeleting}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
