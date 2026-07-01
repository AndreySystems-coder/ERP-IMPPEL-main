import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ClipboardPaste, History, Loader2, Save, XCircle } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useToast } from "@/hooks/use-toast";
import type { MobileImportPreviewRow } from "@shared/mobileNotesImport";

type InventoryItem = { id: number; name: string; unit?: string; quantity?: number; type?: string };
type UserItem = { id: number; username: string; fullName?: string; name?: string; role?: string };
type ImportPreview = {
  rows: MobileImportPreviewRow[];
  ignored: MobileImportPreviewRow[];
  summary: Record<string, number | boolean>;
  hash: string;
  duplicate: boolean;
};

const exampleText = `30/06
Lequinho - raspador, extensao, soprador
Jhones - furadeira, batedor, extensao
Paulo - cabo, escada

29/06
Bruno - vassoura
+ 20x broxa`;

const currentYear = () => String(new Date().getFullYear());

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
  if (!response.ok) throw new Error(data?.message || response.statusText);
  return data as T;
}

function rowStatusClass(row: MobileImportPreviewRow) {
  if (row.ignored) return "bg-slate-50 text-slate-500";
  if (row.status === "ok") return "bg-emerald-50 text-emerald-700";
  if (row.status === "bloqueado") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

function typeLabel(type: MobileImportPreviewRow["type"]) {
  if (type === "entrada") return "Entrada";
  if (type === "retirada") return "Retirada";
  return "Saída";
}

export default function MobileNotesImport({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [importYear, setImportYear] = useState(currentYear());
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [rows, setRows] = useState<MobileImportPreviewRow[]>([]);
  const [activeTab, setActiveTab] = useState<"entrada" | "saida" | "retirada" | "pendentes" | "ignorados">("entrada");
  const [aliasRows, setAliasRows] = useState<Record<string, boolean>>({});
  const [report, setReport] = useState<any>(null);
  const parsedImportYear = Number(importYear);
  const isImportYearValid = Number.isInteger(parsedImportYear) && parsedImportYear >= 2020 && parsedImportYear <= 2100;

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    queryFn: () => apiRequest("/api/inventory"),
  });
  const { data: users = [] } = useQuery<UserItem[]>({
    queryKey: ["/api/users"],
    queryFn: () => apiRequest("/api/users"),
  });
  const { data: history = [] } = useQuery<any[]>({
    queryKey: ["/api/mobile-import/history"],
    queryFn: () => apiRequest("/api/mobile-import/history"),
  });

  const previewMutation = useMutation({
    mutationFn: () => apiRequest<ImportPreview>("/api/mobile-import/preview", {
      method: "POST",
      body: JSON.stringify({ text, importYear: parsedImportYear }),
    }),
    onSuccess: (data) => {
      setPreview(data);
      setRows(data.rows);
      setReport(null);
      setActiveTab(data.summary.duvidosos || data.summary.bloqueados ? "pendentes" : "retirada");
      toast({ title: "Preview gerado", description: `${data.rows.length} linha(s) interpretada(s).` });
    },
    onError: (error: Error) => toast({ title: "Não foi possível interpretar", description: error.message, variant: "destructive" }),
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      const aliasesToSave = rows
        .filter(row => row.type === "retirada" && row.rawEmployee && row.userId && aliasRows[row.id])
        .map(row => ({ alias: row.rawEmployee, userId: row.userId }));
      return apiRequest("/api/mobile-import/apply", {
        method: "POST",
        body: JSON.stringify({ text, importYear: parsedImportYear, rows, aliasesToSave }),
      });
    },
    onSuccess: (data) => {
      setReport(data);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/material-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-import/history"] });
      toast({ title: "Registro rapido aplicado", description: "Movimentacoes e retiradas foram registradas em modo merge." });
    },
    onError: (error: Error) => toast({ title: "Importação bloqueada", description: error.message, variant: "destructive" }),
  });

  const groupedRows = useMemo(() => ({
    entrada: rows.filter(row => row.type === "entrada" && !row.ignored),
    saida: rows.filter(row => row.type === "saida" && !row.ignored),
    retirada: rows.filter(row => row.type === "retirada" && !row.ignored),
    pendentes: rows.filter(row => row.status !== "ok" && !row.ignored),
    ignorados: rows.filter(row => row.ignored),
  }), [rows]);

  const withdrawalGroups = useMemo(() => {
    const groups = new Map<string, MobileImportPreviewRow[]>();
    for (const row of groupedRows.retirada) {
      const employee = row.username || row.rawEmployee || "Funcionario pendente";
      const key = `${row.date}|${employee}`;
      groups.set(key, [...(groups.get(key) || []), row]);
    }
    return Array.from(groups.entries()).map(([key, groupRows]) => {
      const [date, employee] = key.split("|");
      return { key, date, employee, rows: groupRows };
    });
  }, [groupedRows.retirada]);

  const canApply = rows.some(row => !row.ignored) &&
    !preview?.duplicate &&
    rows.every(row => row.ignored || (row.status === "ok" && row.inventoryId && (row.type !== "retirada" || row.userId)));

  const updateRow = (id: string, updates: Partial<MobileImportPreviewRow>) => {
    setRows(current => current.map(row => row.id === id ? { ...row, ...updates } : row));
  };

  const selectInventory = (row: MobileImportPreviewRow, inventoryId: number) => {
    const item = inventory.find(candidate => Number(candidate.id) === Number(inventoryId));
    updateRow(row.id, {
      inventoryId,
      itemName: item?.name || row.itemName,
      itemConfidence: 100,
      status: row.type === "retirada" && !row.userId ? "duvidoso" : "ok",
      warnings: row.type === "retirada" && !row.userId ? ["Funcionário pendente"] : [],
    });
  };

  const selectUser = (row: MobileImportPreviewRow, userId: number) => {
    const user = users.find(candidate => Number(candidate.id) === Number(userId));
    updateRow(row.id, {
      userId,
      username: user?.username || row.username,
      userConfidence: 100,
      status: row.inventoryId ? "ok" : "duvidoso",
      warnings: row.inventoryId ? [] : ["Material duvidoso"],
    });
  };

  const visibleRows = groupedRows[activeTab];

  return (
    <div className="space-y-5">
      {!embedded && (
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold text-slate-950">Registro Rapido de Materiais</h1>
          <p className="text-sm text-slate-600">Cole anotacoes do celular, confira o preview e confirme somente o que estiver correto.</p>
        </div>
      )}

      <Card className="p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Anotacoes do celular</label>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={exampleText}
              className="min-h-[220px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Ano da importacao</label>
              <Input type="number" min="2020" max="2100" value={importYear} onChange={(event) => setImportYear(event.target.value)} />
              {!isImportYearValid && <p className="mt-1 text-xs font-semibold text-red-600">Informe um ano valido antes de interpretar.</p>}
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Datas sem ano usam o ano selecionado. Nada e aplicado sem confirmacao.
            </div>
            <Button onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending || !text.trim() || !isImportYearValid} className="mt-auto gap-2">
              {previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPaste className="h-4 w-4" />}
              Gerar preview
            </Button>
          </div>
        </div>
      </Card>

      {preview && (
        <Card className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Preview</h2>
              <p className="text-sm text-slate-500">Ano {importYear} · Hash {preview.hash.slice(0, 12)} · {rows.length} linha(s) lida(s)</p>
              {preview.duplicate && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  <AlertTriangle className="h-4 w-4" /> Esta anotação já foi importada.
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
              {[
                ["Entradas", groupedRows.entrada.length],
                ["Saídas", groupedRows.saida.length],
                ["Retiradas", groupedRows.retirada.length],
                ["Pendentes", groupedRows.pendentes.length],
                ["Ignorados", groupedRows.ignorados.length],
                ["Pode importar", canApply ? "Sim" : "Não"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="text-lg font-bold text-slate-900">{value}</div>
                  <div className="text-[11px] font-semibold uppercase text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ["entrada", "Entradas", groupedRows.entrada.length],
              ["saida", "Saídas", groupedRows.saida.length],
              ["retirada", "Retiradas", groupedRows.retirada.length],
              ["pendentes", "Duvidosos", groupedRows.pendentes.length],
              ["ignorados", "Ignorados", groupedRows.ignorados.length],
            ].map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${activeTab === key ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-700 hover:border-primary/40"}`}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {activeTab === "retirada" && (
            <div className="mt-4 space-y-3">
              {withdrawalGroups.map(group => (
                <details key={group.key} open className="rounded-lg border border-slate-200 bg-white">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="font-bold text-slate-900">{group.employee}</div>
                      <div className="text-xs text-slate-500">Registro Rapido - {new Date(`${group.date}T12:00:00`).toLocaleDateString("pt-BR")}</div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{group.rows.length} item(ns)</span>
                  </summary>
                  <div className="border-t border-slate-100 p-3">
                    <div className="space-y-2">
                      {group.rows.map(row => (
                        <div key={row.id} className="grid gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-[1fr_110px_220px_120px] md:items-center">
                          <div>
                            <div className="font-semibold text-slate-800">{row.itemName || row.rawItem}</div>
                            <div className="text-xs text-slate-500">Texto: {row.rawText}</div>
                            {row.warnings.length > 0 && <div className="mt-1 text-xs font-semibold text-amber-700">{row.warnings.join(" · ")}</div>}
                          </div>
                          <Input type="number" min={1} value={row.quantity} onChange={(event) => updateRow(row.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} />
                          <select className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" value={row.inventoryId || ""} onChange={(event) => selectInventory(row, Number(event.target.value))}>
                            <option value="">Selecionar material</option>
                            {inventory.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                          <Button variant="outline" size="sm" onClick={() => updateRow(row.id, { ignored: !row.ignored, status: row.ignored ? "duvidoso" : "ignorado" as any })}>
                            {row.ignored ? "Reativar" : "Ignorar"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
              {withdrawalGroups.length === 0 && <div className="rounded-lg border border-slate-200 px-4 py-8 text-center text-sm text-slate-500">Nenhuma retirada encontrada.</div>}
            </div>
          )}

          <div className={activeTab === "retirada" ? "hidden" : "mt-4 overflow-x-auto rounded-lg border border-slate-200"}>
            <table className="min-w-[1080px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Qtd.</th>
                  <th className="px-3 py-2">Texto original</th>
                  <th className="px-3 py-2">Material reconhecido</th>
                  <th className="px-3 py-2">Funcionário</th>
                  <th className="px-3 py-2">Confiança</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2"><Input type="date" value={row.date} onChange={(event) => updateRow(row.id, { date: event.target.value })} /></td>
                    <td className="px-3 py-2">
                      <select className="rounded-md border border-slate-300 px-2 py-2" value={row.type} onChange={(event) => updateRow(row.id, { type: event.target.value as any })}>
                        <option value="entrada">Entrada</option>
                        <option value="saida">Saída</option>
                        <option value="retirada">Retirada</option>
                      </select>
                    </td>
                    <td className="px-3 py-2"><Input type="number" min={1} value={row.quantity} onChange={(event) => updateRow(row.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} /></td>
                    <td className="px-3 py-2 text-slate-700">{row.rawText}</td>
                    <td className="px-3 py-2">
                      <select className="w-full rounded-md border border-slate-300 px-2 py-2" value={row.inventoryId || ""} onChange={(event) => selectInventory(row, Number(event.target.value))}>
                        <option value="">Selecionar material</option>
                        {inventory.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {row.type === "retirada" ? (
                        <div className="space-y-2">
                          <select className="w-full rounded-md border border-slate-300 px-2 py-2" value={row.userId || ""} onChange={(event) => selectUser(row, Number(event.target.value))}>
                            <option value="">Selecionar funcionário</option>
                            {users.filter(user => user.role !== "admin").map(user => <option key={user.id} value={user.id}>{user.fullName || user.name || user.username}</option>)}
                          </select>
                          {row.rawEmployee && row.userId && (
                            <label className="flex items-center gap-2 text-xs text-slate-500">
                              <input type="checkbox" checked={Boolean(aliasRows[row.id])} onChange={(event) => setAliasRows(current => ({ ...current, [row.id]: event.target.checked }))} />
                              Salvar alias “{row.rawEmployee}”
                            </label>
                          )}
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2">{row.itemConfidence}%{row.userConfidence ? ` / ${row.userConfidence}%` : ""}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${rowStatusClass(row)}`}>{row.ignored ? "ignorado" : row.status}</span>
                      {row.warnings.length > 0 && <div className="mt-1 text-xs text-amber-700">{row.warnings.join(" · ")}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <Button variant="outline" size="sm" onClick={() => updateRow(row.id, { ignored: !row.ignored, status: row.ignored ? "duvidoso" : "ignorado" as any })}>
                        {row.ignored ? "Reativar" : "Ignorar"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">Nenhum item nesta categoria.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <Button variant="outline" onClick={() => { setPreview(null); setRows([]); setReport(null); }} className="gap-2">
              <XCircle className="h-4 w-4" /> Cancelar
            </Button>
            <Button onClick={() => applyMutation.mutate()} disabled={!canApply || applyMutation.isPending} className="gap-2">
              {applyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmar registro
            </Button>
          </div>
        </Card>
      )}

      {report && (
        <Card className="border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <Save className="mt-1 h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="font-bold text-emerald-900">Registro rapido salvo no historico</h2>
              <p className="mt-1 text-sm text-emerald-800">
                {report.summary?.movimentosCriados || 0} movimentação(ões), {report.summary?.retiradasCriadas || 0} retirada(s) e {report.summary?.aliasesSalvos || 0} alias salvo(s).
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-slate-500" />
          <h2 className="text-xl font-bold text-slate-900">Historico de registros rapidos</h2>
        </div>
        <div className="space-y-2">
          {history.slice(0, 12).map((item) => {
            const summary = (() => { try { return JSON.parse(item.summary || "{}"); } catch { return {}; } })();
            return (
              <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{item.importedByUsername}</strong>
                  <span className="text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString("pt-BR") : "—"}</span>
                </div>
                <div className="mt-1 text-slate-600">
                  {summary.movimentosCriados || 0} movimentos · {summary.retiradasCriadas || 0} retiradas · {summary.ignorados || 0} ignorados · Hash {String(item.hash || "").slice(0, 12)}
                </div>
              </div>
            );
          })}
          {history.length === 0 && <p className="text-sm text-slate-500">Nenhum registro rapido aplicado ainda.</p>}
        </div>
      </Card>
    </div>
  );
}
