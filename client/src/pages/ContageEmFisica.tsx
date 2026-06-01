import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/Button";
import { Warehouse, Package, AlertTriangle, CheckCircle, Save, RefreshCw } from "lucide-react";

const apiCall = async (method: string, path: string, body?: any) => {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
};

export default function ContageEmFisica() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: () => apiCall("GET", "/api/inventory"),
  });

  const [counts, setCounts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const allItems = items as any[];
  const lowStockItems = allItems.filter(i => i.quantity <= i.minStock);
  const modified = Object.keys(counts).filter(k => counts[Number(k)] !== "" && Number(counts[Number(k)]) !== allItems.find(i => i.id === Number(k))?.quantity);

  const handleSaveAll = async () => {
    if (modified.length === 0) {
      toast({ title: "Nenhuma alteração para salvar", variant: "destructive" });
      return;
    }
    setSaving(true);
    let ok = 0;
    try {
      for (const key of modified) {
        const id = Number(key);
        const newQty = Math.max(0, Math.round(Number(counts[id])));
        const item = allItems.find(i => i.id === id);
        if (!item) continue;
        await apiCall("PUT", `/api/inventory/${id}`, { ...item, quantity: newQty });
        setSavedIds(prev => new Set(prev).add(id));
        ok++;
      }
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: `✅ ${ok} item(ns) atualizado(s) com sucesso!` });
      setCounts({});
      setSavedIds(new Set());
    } catch {
      toast({ title: "Erro ao salvar contagem", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-white" />
            </div>
            Contagem Física Rápida
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Informe a quantidade real contada para cada item e clique em Salvar Tudo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
          <Button onClick={handleSaveAll} isLoading={saving} disabled={modified.length === 0} data-testid="button-save-all">
            <Save className="w-4 h-4 mr-2" /> Salvar Tudo {modified.length > 0 && `(${modified.length})`}
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <Package className="w-8 h-8 text-primary" />
          <div>
            <p className="text-2xl font-bold text-slate-900">{allItems.length}</p>
            <p className="text-xs text-slate-500">Itens no estoque</p>
          </div>
        </div>
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${lowStockItems.length > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
          <AlertTriangle className={`w-8 h-8 ${lowStockItems.length > 0 ? "text-red-500" : "text-emerald-500"}`} />
          <div>
            <p className={`text-2xl font-bold ${lowStockItems.length > 0 ? "text-red-700" : "text-emerald-700"}`}>{lowStockItems.length}</p>
            <p className="text-xs text-slate-500">Abaixo do mínimo</p>
          </div>
        </div>
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${modified.length > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
          <CheckCircle className={`w-8 h-8 ${modified.length > 0 ? "text-amber-500" : "text-slate-400"}`} />
          <div>
            <p className={`text-2xl font-bold ${modified.length > 0 ? "text-amber-700" : "text-slate-500"}`}>{modified.length}</p>
            <p className="text-xs text-slate-500">Alterações pendentes</p>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px_120px_40px] gap-0 text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3 bg-slate-50 border-b border-slate-100">
            <span>Produto / Material</span>
            <span className="text-center">Tipo</span>
            <span className="text-center">Atual</span>
            <span className="text-center">Contagem Real</span>
            <span />
          </div>
          <div className="divide-y divide-slate-50">
            {allItems.map((item: any) => {
              const isLow = item.quantity <= item.minStock;
              const inputVal = counts[item.id] ?? "";
              const parsedCount = inputVal !== "" ? Number(inputVal) : null;
              const isDirty = parsedCount !== null && parsedCount !== item.quantity;
              const isSaved = savedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-[1fr_80px_80px_120px_40px] gap-0 items-center px-5 py-3 transition-colors ${isDirty ? "bg-amber-50" : isSaved ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                  data-testid={`row-item-${item.id}`}
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.unit || "unid"}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{item.type}</span>
                  </div>
                  <div className="text-center">
                    <span className={`font-bold text-sm ${isLow ? "text-red-600" : "text-slate-700"}`}>{item.quantity}</span>
                    {isLow && <p className="text-[9px] text-red-500 font-semibold">⚠ baixo</p>}
                  </div>
                  <div className="text-center px-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={inputVal}
                      onChange={e => setCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder={String(item.quantity)}
                      data-testid={`input-count-${item.id}`}
                      className={`w-full text-center px-2 py-1.5 text-sm rounded-lg border-2 font-bold focus:outline-none transition-all ${
                        isDirty
                          ? "border-amber-400 bg-amber-50 text-amber-800 focus:border-amber-500"
                          : "border-slate-200 bg-slate-50 focus:border-primary"
                      }`}
                    />
                  </div>
                  <div className="flex justify-center">
                    {isSaved && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {isDirty && !isSaved && (
                      <span className={`text-xs font-bold ${parsedCount! > item.quantity ? "text-emerald-600" : "text-red-500"}`}>
                        {parsedCount! > item.quantity ? `+${parsedCount! - item.quantity}` : `${parsedCount! - item.quantity}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modified.length > 0 && (
        <div className="sticky bottom-4 flex justify-center">
          <div className="bg-amber-600 text-white rounded-2xl px-6 py-3 shadow-xl flex items-center gap-4">
            <span className="font-bold text-sm">{modified.length} item(ns) com alteração pendente</span>
            <Button
              onClick={handleSaveAll}
              isLoading={saving}
              className="bg-white text-amber-700 hover:bg-amber-50 font-bold text-sm px-4 py-2 rounded-xl"
              data-testid="button-save-sticky"
            >
              <Save className="w-4 h-4 mr-1.5" /> Salvar Tudo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
