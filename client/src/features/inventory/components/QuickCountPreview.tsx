import { AlertTriangle, CheckCircle, Package, TrendingDown, TrendingUp, X } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import type { InventoryItem, QuickCountRow } from "@/features/inventory/types";

type QuickCountPreviewProps = {
  countedRows: QuickCountRow[];
  toZeroRows: QuickCountRow[];
  alreadyZeroRows: QuickCountRow[];
  entradas: QuickCountRow[];
  saidas: QuickCountRow[];
  noMatch: QuickCountRow[];
  duplicates: QuickCountRow[];
  totalActions: number;
  confirmZero: boolean;
  isApplying: boolean;
  inventory: InventoryItem[];
  onConfirmZeroChange: (checked: boolean) => void;
  onReviewRow: (row: QuickCountRow, patch: { inventoryId?: number | null; date?: string; qty?: number }) => void;
  onRemoveRow: (row: QuickCountRow) => void;
  onApply: () => void;
};

function MovementBadge({ type }: { type: "ENTRADA" | "SAÍDA" }) {
  const isEntrada = type === "ENTRADA";
  const Icon = isEntrada ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${isEntrada ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      <Icon className="h-3 w-3" />
      {type}
    </span>
  );
}

function EmptyDash() {
  return <span className="text-xs text-slate-400">-</span>;
}

export function QuickCountPreview({
  countedRows,
  toZeroRows,
  alreadyZeroRows,
  entradas,
  saidas,
  noMatch,
  duplicates,
  totalActions,
  confirmZero,
  isApplying,
  inventory,
  onConfirmZeroChange,
  onReviewRow,
  onRemoveRow,
  onApply,
}: QuickCountPreviewProps) {
  if (countedRows.length === 0 && toZeroRows.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
        <Package className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-bold text-primary">Contagem Física Completa</p>
          <p className="mt-0.5 text-xs text-slate-600">
            <strong>{countedRows.filter(row => row.matchedItem && !row.isDuplicate).length}</strong> produto(s) da lista serão atualizados ·
            <span className="font-semibold text-red-700"> {toZeroRows.length} produto(s) não listados serão zerados</span> ·
            <span className="text-slate-400"> {alreadyZeroRows.length} já estavam em zero</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {entradas.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-xs font-semibold text-green-800">
            <TrendingUp className="h-3.5 w-3.5" />
            {entradas.length} entrada(s)
          </div>
        )}
        {saidas.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-800">
            <TrendingDown className="h-3.5 w-3.5" />
            {saidas.length} ajuste(s) de saída
          </div>
        )}
        {toZeroRows.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-100 px-4 py-2.5 text-xs font-semibold text-red-900">
            <X className="h-3.5 w-3.5" />
            {toZeroRows.length} produto(s) a zerar
          </div>
        )}
        {noMatch.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            {noMatch.length} não identificado(s)
          </div>
        )}
        {duplicates.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-semibold text-orange-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            {duplicates.length} duplicado(s) ignorado(s)
          </div>
        )}
      </div>

      <Card className="p-4">
        <div className="mb-3">
          <p className="text-sm font-bold text-slate-800">Revisão manual</p>
          <p className="text-xs text-slate-500">Corrija data, material ou quantidade antes de aplicar. Itens não reconhecidos bloqueiam a confirmação.</p>
        </div>
        <div className="space-y-2">
          {countedRows.filter(row => !row.isDuplicate).map((row, index) => (
            <div key={`${row.inputName}-${index}`} className={`grid gap-2 rounded-lg border p-3 lg:grid-cols-[140px_minmax(0,1fr)_100px_42px] ${!row.matchedItem || row.confidence < 70 ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
              <input type="date" value={row.date || ""} onChange={event => onReviewRow(row, { date: event.target.value })} className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label={`Data de ${row.inputName}`} />
              <select value={row.matchedItem?.id || ""} onChange={event => onReviewRow(row, { inventoryId: Number(event.target.value) || null })} className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm" aria-label={`Material de ${row.inputName}`}>
                <option value="">Revisar: {row.inputName}</option>
                {inventory.map(item => <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit || "unid"})</option>)}
              </select>
              <input type="number" min="0" step="1" value={row.qty} onChange={event => onReviewRow(row, { qty: Math.max(0, Number(event.target.value)) })} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" aria-label={`Quantidade de ${row.inputName}`} />
              <Button variant="outline" onClick={() => onRemoveRow(row)} className="h-10 px-2" title="Remover linha"><X className="h-4 w-4 text-red-600" /></Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <p className="text-sm font-bold text-slate-700">Itens da sua lista ({countedRows.length})</p>
          <p className="text-xs text-slate-400">Verifique antes de aplicar</p>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {countedRows.map((row, idx) => {
            const noMatchRow = !row.matchedItem;
            const isDuplicate = row.isDuplicate;
            const noChange = row.matchedItem && row.diff === 0 && !isDuplicate;
            const isEntrada = row.movType === "ENTRADA";

            return (
              <div key={`${row.inputName}-${idx}`} className={`rounded-xl border p-4 ${isDuplicate ? "border-orange-200 bg-orange-50" : noMatchRow ? "border-amber-200 bg-amber-50" : noChange ? "border-slate-200 bg-slate-50" : isEntrada ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`} data-testid={`rapida-row-${idx}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-slate-500">{row.inputName}</p>
                    {row.date && <p className="mt-1 text-xs font-semibold text-blue-700">{new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-BR")}</p>}
                    <p className="mt-1 text-sm font-bold text-slate-900">{noMatchRow ? "Não identificado" : row.matchedItem!.name}</p>
                  </div>
                  {noMatchRow || isDuplicate || noChange || !row.movType ? <EmptyDash /> : <MovementBadge type={row.movType} />}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-white px-2 py-2">
                    <p className="text-slate-400">Contagem</p>
                    <p className="font-bold text-slate-800">{row.qty}</p>
                  </div>
                  <div className="rounded-lg bg-white px-2 py-2">
                    <p className="text-slate-400">Atual</p>
                    <p className="font-bold text-slate-800">{row.currentQuantity ?? row.matchedItem?.quantity ?? "-"}</p>
                  </div>
                  <div className="rounded-lg bg-white px-2 py-2">
                    <p className="text-slate-400">Dif.</p>
                    <p className={`font-bold ${row.diff > 0 ? "text-green-700" : row.diff < 0 ? "text-red-700" : "text-slate-500"}`}>{row.diff > 0 ? `+${row.diff}` : row.diff}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <th className="px-5 py-3 text-left">Você digitou</th>
                <th className="px-4 py-3 text-center">Data</th>
                <th className="px-4 py-3 text-left">Produto identificado</th>
                <th className="px-4 py-3 text-center">Conf.</th>
                <th className="px-4 py-3 text-center">Contagem</th>
                <th className="px-4 py-3 text-center">Estoque Atual</th>
                <th className="px-4 py-3 text-center">Estoque Após</th>
                <th className="px-4 py-3 text-center">Diferença</th>
                <th className="px-4 py-3 text-center">Movimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {countedRows.map((row, idx) => {
                const noMatchRow = !row.matchedItem;
                const isDuplicate = row.isDuplicate;
                const noChange = row.matchedItem && row.diff === 0 && !isDuplicate;
                const isEntrada = row.movType === "ENTRADA";

                return (
                  <tr key={`${row.inputName}-${idx}`} data-testid={`rapida-row-${idx}`} className={`transition-colors ${isDuplicate ? "bg-orange-50/60 opacity-70" : noMatchRow ? "bg-amber-50/60" : noChange ? "bg-slate-50/60" : isEntrada ? "bg-green-50/40" : "bg-red-50/40"}`}>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{row.inputName}</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-600">{row.date ? new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3">
                      {noMatchRow ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> Não identificado</span>
                      ) : isDuplicate ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-orange-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>{row.matchedItem!.name}</span>
                          <span className="ml-1 text-orange-500">(duplicado ignorado)</span>
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-900">{row.matchedItem!.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {noMatchRow || isDuplicate ? <EmptyDash /> : (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${row.confidence >= 80 ? "bg-green-100 text-green-700" : row.confidence >= 50 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                          {row.confidence}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">
                      {row.qty} <span className="text-xs font-normal text-slate-400">{row.matchedItem?.unit || "unid"}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {noMatchRow ? <EmptyDash /> : <span>{row.currentQuantity ?? row.matchedItem!.quantity} <span className="text-xs text-slate-400">{row.matchedItem!.unit || "unid"}</span></span>}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {noMatchRow || isDuplicate ? <EmptyDash /> : (
                        <span className={row.diff > 0 ? "text-green-700" : row.diff < 0 ? "text-red-700" : "text-slate-500"}>
                          {row.qty} <span className="text-xs font-normal text-slate-400">{row.matchedItem!.unit || "unid"}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {noMatchRow || isDuplicate ? <EmptyDash /> : noChange ? (
                        <span className="text-xs text-slate-400">Sem diferença</span>
                      ) : (
                        <span className={`text-sm font-bold ${row.diff > 0 ? "text-green-700" : "text-red-700"}`}>
                          {row.diff > 0 ? `+${row.diff}` : row.diff}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {noMatchRow || noChange || isDuplicate || !row.movType ? <EmptyDash /> : <MovementBadge type={row.movType} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {toZeroRows.length > 0 && (
        <Card className="overflow-hidden border-red-200">
          <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-5 py-3">
            <p className="flex items-center gap-2 text-sm font-bold text-red-800">
              <X className="h-4 w-4" /> Não encontrados na contagem - serão zerados ({toZeroRows.length})
            </p>
            <p className="text-xs text-red-400">Não apareceram na sua lista</p>
          </div>
          <div className="divide-y divide-red-50">
            {toZeroRows.map((row, idx) => (
              <div key={`${row.matchedItem!.id}-${idx}`} className="grid gap-2 bg-red-50/30 px-5 py-3 text-sm sm:grid-cols-[1fr_auto_auto]" data-testid={`rapida-zero-row-${idx}`}>
                <p className="font-semibold text-slate-800">{row.matchedItem!.name}</p>
                <p className="text-slate-600">Atual: <strong>{row.matchedItem!.quantity}</strong> {row.matchedItem!.unit || "unid"}</p>
                <p className="font-bold text-red-700">Após: 0 {row.matchedItem!.unit || "unid"}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {alreadyZeroRows.length > 0 && (
        <p className="text-center text-xs text-slate-400">
          + {alreadyZeroRows.length} produto(s) já estão em zero e não precisam de ajuste.
        </p>
      )}

      {totalActions > 0 && (
        <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5 text-sm text-slate-700">
            <p className="font-bold text-primary">Pronto para aplicar a contagem física completa</p>
            <p className="text-xs text-slate-500">
              {entradas.length > 0 && `${entradas.length} entrada(s)`}
              {saidas.length > 0 && ` · ${saidas.length} saída(s) da lista`}
              {toZeroRows.length > 0 && ` · ${toZeroRows.length} produto(s) a zerar`}
              {noMatch.length > 0 && ` · ${noMatch.length} não identificado(s) ignorado(s)`}
            </p>
            {toZeroRows.length > 0 && (
              <label className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700">
                <input
                  type="checkbox"
                  checked={confirmZero}
                  onChange={event => onConfirmZeroChange(event.target.checked)}
                  className="mt-0.5"
                  data-testid="checkbox-confirm-zerar"
                />
                Confirmo que a lista colada representa a contagem física completa e que os itens não listados devem ser zerados.
              </label>
            )}
          </div>
          <Button
            onClick={onApply}
            isLoading={isApplying}
            disabled={noMatch.length > 0 || (toZeroRows.length > 0 && !confirmZero)}
            className="min-h-11 whitespace-nowrap bg-primary hover:bg-primary/90"
            data-testid="button-apply-rapida"
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Aplicar Contagem Física Completa
          </Button>
        </div>
      )}
    </div>
  );
}
