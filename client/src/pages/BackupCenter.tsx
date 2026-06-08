import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Database, Upload, Clock, FileJson, FileText, Trash2,
  RefreshCw, History, CheckCircle2, AlertTriangle, Package, Users,
  Briefcase, ClipboardList, ShoppingCart, Layers, PackageCheck, Shield,
  HardDrive,
} from "lucide-react";
import { Card, CardContent } from "@/components/Card";
import BackupManager, {
  getBackupHistory, getRestoreLog, generatePDF, fmtDateTime,
  type BackupType, type BackupHistoryEntry, type RestoreLogEntry,
} from "@/components/BackupManager";
import { useUser } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

// ─── Config ───────────────────────────────────────────────────────────────────
const ALL_BACKUP_TYPES: { type: BackupType; label: string; icon: React.ElementType; color: string; description: string }[] = [
  { type: "estoque", label: "Estoque", icon: Package, color: "text-blue-600 bg-blue-50 border-blue-200", description: "Itens e movimentações" },
  { type: "produtos", label: "Catálogo de Produtos", icon: ShoppingCart, color: "text-emerald-600 bg-emerald-50 border-emerald-200", description: "Produtos do catálogo de vendas" },
  { type: "servicos", label: "Catálogo de Serviços", icon: Layers, color: "text-violet-600 bg-violet-50 border-violet-200", description: "Serviços com custos e margens" },
  { type: "materiais", label: "Controle de Materiais", icon: PackageCheck, color: "text-amber-600 bg-amber-50 border-amber-200", description: "Retiradas e consumo de obra" },
  { type: "clientes", label: "Clientes", icon: Users, color: "text-sky-600 bg-sky-50 border-sky-200", description: "Cadastro completo de clientes" },
  { type: "orcamentos", label: "Orçamentos", icon: Briefcase, color: "text-orange-600 bg-orange-50 border-orange-200", description: "Orçamentos e negociações" },
  { type: "ordens-servico", label: "Ordens de Serviço", icon: ClipboardList, color: "text-rose-600 bg-rose-50 border-rose-200", description: "Ordens de execução de obras" },
  { type: "financeiro", label: "Financeiro", icon: FileText, color: "text-green-600 bg-green-50 border-green-200", description: "Pagamentos, recebimentos e caixa" },
  { type: "pos-venda", label: "Garantias/Pós-venda", icon: Shield, color: "text-teal-600 bg-teal-50 border-teal-200", description: "Garantias, NPS e manutenções" },
];

const MODE_LABEL: Record<string, string> = {
  merge: "Merge",
  overwrite: "Sobrescrita",
};

// ─── Re-download helper ───────────────────────────────────────────────────────
function reDownloadJSON(entry: BackupHistoryEntry) {
  const blob = new Blob([JSON.stringify(entry.backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${entry.fileName}.json`; a.click();
  URL.revokeObjectURL(url);
}

function reDownloadPDF(entry: BackupHistoryEntry) {
  generatePDF(entry.type, entry.backup);
}

// ─── History Card ─────────────────────────────────────────────────────────────
function getModuleSummary(entry: BackupHistoryEntry): string {
  const d = entry.backup?.data || {};
  const parts: string[] = [];
  if (d.items?.length)       parts.push(`${d.items.length} itens`);
  if (d.movements?.length)   parts.push(`${d.movements.length} moviment.`);
  if (d.products?.length)    parts.push(`${d.products.length} produtos`);
  if (d.services?.length)    parts.push(`${d.services.length} serviços`);
  if (d.withdrawals?.length) parts.push(`${d.withdrawals.length} retiradas`);
  if (d.clients?.length)     parts.push(`${d.clients.length} clientes`);
  if (d.jobs?.length)        parts.push(`${d.jobs.length} orçamentos`);
  if (d.workOrders?.length)  parts.push(`${d.workOrders.length} ordens`);
  if (d.payments?.length)    parts.push(`${d.payments.length} pagamentos`);
  if (d.transactions?.length) parts.push(`${d.transactions.length} movimentos`);
  if (d.npsResponses?.length) parts.push(`${d.npsResponses.length} NPS`);
  if (d.maintenanceReminders?.length) parts.push(`${d.maintenanceReminders.length} lembretes`);
  if (d.warranties?.length)  parts.push(`${d.warranties.length} garantias`);
  return parts.join(" · ") || "—";
}

function HistoryRow({ entry, onDelete }: { entry: BackupHistoryEntry; onDelete: () => void }) {
  const cfg = ALL_BACKUP_TYPES.find(t => t.type === entry.type);
  const Icon = cfg?.icon || Database;
  const moduleSummary = getModuleSummary(entry);
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${cfg?.color || "text-slate-500 bg-slate-50 border-slate-200"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{entry.label}</p>
        <p className="text-xs text-slate-500">{fmtDateTime(entry.exportedAt)}</p>
        <p className="text-xs text-slate-400 mt-0.5">{moduleSummary}</p>
      </div>
      <div className="text-right shrink-0 mr-2 hidden sm:block">
        <p className="text-sm font-semibold text-slate-700">{entry.sizeKB} KB</p>
        <p className="text-xs text-slate-400">tamanho</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => reDownloadJSON(entry)}
          className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-slate-400 transition-colors"
          title="Baixar JSON"
        >
          <FileJson className="w-4 h-4" />
        </button>
        <button
          onClick={() => reDownloadPDF(entry)}
          className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
          title="Gerar PDF"
        >
          <FileText className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
          title="Remover do histórico"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Restore Log Row ──────────────────────────────────────────────────────────
function LogRow({ entry }: { entry: RestoreLogEntry }) {
  const cfg = ALL_BACKUP_TYPES.find(t => t.type === entry.type);
  const Icon = cfg?.icon || Database;
  const isOverwrite = entry.mode === "overwrite";
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${cfg?.color || "text-slate-500 bg-slate-50 border-slate-200"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800">{entry.label}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isOverwrite ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
            {MODE_LABEL[entry.mode]}
          </span>
        </div>
        <p className="text-xs text-slate-500">{fmtDateTime(entry.restoredAt)} · backup de {fmtDateTime(entry.backupDate)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-emerald-600">+{entry.created} criado(s)</p>
        <p className="text-xs text-slate-500">{entry.updated} atualizado(s){entry.deleted ? ` · ${entry.deleted} excluído(s)` : ""}</p>
      </div>
    </div>
  );
}

type TextPreview = {
  type: BackupType;
  backup: any;
  rows: { name: string; detail: string }[];
};

function parseNumber(value?: string) {
  if (!value) return 0;
  return Number(value.replace(/\./g, "").replace(",", ".")) || 0;
}

function parseTextRestore(type: BackupType, text: string): TextPreview {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const rows: { name: string; detail: string }[] = [];

  if (type === "estoque") {
    const items = lines.map(line => {
      const match = line.match(/(?:produto|material)\s*:\s*([^,;]+).*?(?:quantidade|qtd)\s*:\s*([\d.,]+)/i);
      if (!match) return null;
      const item = { name: match[1].trim(), type: "material", unit: "unid", quantity: parseNumber(match[2]), minStock: 0, pricePerUnit: 0 };
      rows.push({ name: item.name, detail: `${item.quantity} ${item.unit}` });
      return item;
    }).filter(Boolean);
    if (!items.length) throw new Error("Use linhas como: Produto: Manta asfáltica, quantidade: 20");
    return { type, rows, backup: { type, version: "text-preview", exportedAt: new Date().toISOString(), data: { items } } };
  }

  if (type === "produtos") {
    const products = lines.map(line => {
      const match = line.match(/produto\s*:\s*([^,;]+)(?:.*?(?:preço|valor)\s*:\s*([\d.,]+))?/i);
      if (!match) return null;
      const product = { name: match[1].trim(), description: "", category: "Sem Categoria", brand: "", unit: "un", salePrice: parseNumber(match[2]), commission: 0, maxDiscount: 0, active: true };
      rows.push({ name: product.name, detail: product.salePrice ? `R$ ${product.salePrice}` : "Produto sem preço informado" });
      return product;
    }).filter(Boolean);
    if (!products.length) throw new Error("Use linhas como: Produto: Primer, preço: 120");
    return { type, rows, backup: { type, version: "text-preview", exportedAt: new Date().toISOString(), data: { products } } };
  }

  if (type === "servicos") {
    const services = lines.map(line => {
      const match = line.match(/servi[cç]o\s*:\s*([^,;]+)(?:.*?(?:preço|valor)\s*:\s*([\d.,]+))?/i);
      if (!match) return null;
      const service = { name: match[1].trim(), description: "", pricePerUnit: parseNumber(match[2]), laborCostPerM2: 0, transportCostPerM2: 0, materialConsumptionPerM2: 0, serviceMaterials: null };
      rows.push({ name: service.name, detail: service.pricePerUnit ? `R$ ${service.pricePerUnit}` : "Serviço sem preço informado" });
      return service;
    }).filter(Boolean);
    if (!services.length) throw new Error("Use linhas como: Serviço: Impermeabilização de laje, preço: 1500");
    return { type, rows, backup: { type, version: "text-preview", exportedAt: new Date().toISOString(), data: { services } } };
  }

  if (type === "clientes") {
    const clients = lines.map(line => {
      const match = line.match(/(?:cliente|nome)\s*:\s*([^,;]+)(?:.*?(?:telefone|fone)\s*:\s*([^,;]+))?/i);
      if (!match) return null;
      const client = { name: match[1].trim(), phone: match[2]?.trim() || "", email: "", city: "", cpfCnpj: "" };
      rows.push({ name: client.name, detail: client.phone || "Cliente sem telefone informado" });
      return client;
    }).filter(Boolean);
    if (!clients.length) throw new Error("Use linhas como: Cliente: João Silva, telefone: 15999999999");
    return { type, rows, backup: { type, version: "text-preview", exportedAt: new Date().toISOString(), data: { clients } } };
  }

  throw new Error("Este módulo ainda exige arquivo técnico restaurável. Use texto estruturado para Estoque, Produtos, Serviços ou Clientes.");
}

function AssistedRestorePanel({ modules, onRestored }: { modules: typeof ALL_BACKUP_TYPES; onRestored: () => void }) {
  const [type, setType] = useState<BackupType>("estoque");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<TextPreview | null>(null);
  const [error, setError] = useState("");

  const restoreMutation = useMutation({
    mutationFn: (backup: any) => apiRequest("POST", `/api/backup/restore/${type}?mode=merge`, backup).then(response => response.json()),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setText("");
      setPreview(null);
      onRestored();
    },
  });

  const buildPreview = () => {
    try {
      setError("");
      setPreview(parseTextRestore(type, text));
    } catch (err: any) {
      setPreview(null);
      setError(err.message || "Não foi possível interpretar o texto.");
    }
  };

  const handlePdf = (file?: File) => {
    if (!file) return;
    setError("PDF não será restaurado automaticamente. Use texto estruturado para gerar preview ou envie um arquivo técnico restaurável do backup.");
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Restaurar por PDF ou Texto</h2>
          <p className="text-sm text-slate-600">Restaure dados com PDF ou texto, sempre com preview antes de aplicar.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Módulo</label>
            <select value={type} onChange={event => { setType(event.target.value as BackupType); setPreview(null); setError(""); }} className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
              {modules.map(module => <option key={module.type} value={module.type}>{module.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Restaurar por PDF</label>
            <input type="file" accept=".pdf" onChange={event => handlePdf(event.target.files?.[0])} className="block min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Restaurar por Texto</label>
          <textarea
            value={text}
            onChange={event => { setText(event.target.value); setPreview(null); }}
            rows={5}
            placeholder={"Produto: Manta asfáltica, quantidade: 20\nProduto: Primer, quantidade: 8\nServiço: Impermeabilização de laje, preço: 1500"}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        {error && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}

        {preview && (
          <div className="rounded-xl border border-slate-200">
            <div className="border-b bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">Preview dos dados</div>
            <div className="divide-y">
              {preview.rows.map((row, index) => (
                <div key={`${row.name}-${index}`} className="flex justify-between gap-3 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-800">{row.name}</span>
                  <span className="text-slate-500">{row.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={buildPreview} disabled={!text.trim()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Gerar preview</button>
          <button type="button" onClick={() => preview && restoreMutation.mutate(preview.backup)} disabled={!preview || restoreMutation.isPending} className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Confirmar restauração
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export type BackupCenterMode = "backup" | "restore" | "exports";

const PAGE_COPY: Record<BackupCenterMode, { title: string; subtitle: string; panelTitle: string; panelDescription: string }> = {
  backup: {
    title: "Backup",
    subtitle: "Gerar cópia segura dos dados",
    panelTitle: "Gerar cópia segura dos dados",
    panelDescription: "Gere um PDF organizado para conferência e segurança dos dados.",
  },
  exports: {
    title: "Exportação",
    subtitle: "Baixar relatórios em PDF",
    panelTitle: "Baixar relatórios em PDF",
    panelDescription: "Exportação gera relatórios visuais para conferência. Não gera arquivo técnico de restauração.",
  },
  restore: {
    title: "Restauração",
    subtitle: "Restaurar dados a partir de backup",
    panelTitle: "Restaurar dados a partir de backup",
    panelDescription: "Restaure com preview e confirmação usando JSON ou TXT estruturado. PDF é usado para conferência e relatório.",
  },
};

export default function BackupCenter({ mode = "backup" }: { mode?: BackupCenterMode }) {
  const { data: user } = useUser();
  const isAdmin = user?.role === "admin";
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);
  const [log, setLog] = useState<RestoreLogEntry[]>([]);
  const [refresh, setRefresh] = useState(0);
  const page = PAGE_COPY[mode];

  useEffect(() => {
    setHistory(getBackupHistory());
    setLog(getRestoreLog());
  }, [refresh]);

  const deleteHistoryEntry = (id: string) => {
    const updated = history.filter(e => e.id !== id);
    localStorage.setItem("imppel_backup_history", JSON.stringify(updated));
    setHistory(updated);
  };

  const clearHistory = () => {
    if (!confirm("Limpar todo o histórico de backups? (Os arquivos baixados não são afetados)")) return;
    localStorage.removeItem("imppel_backup_history");
    setHistory([]);
  };

  const totalSizeKB = history.reduce((s, e) => s + (e.sizeKB || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-primary" />
            {page.title}
          </h1>
          <p className="text-slate-500 mt-1">{page.subtitle}</p>
        </div>
        <button
          onClick={() => setRefresh(r => r + 1)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{history.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Backups gerados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{log.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Restaurações realizadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{totalSizeKB > 1024 ? `${(totalSizeKB / 1024).toFixed(1)} MB` : `${totalSizeKB} KB`}</p>
            <p className="text-xs text-slate-500 mt-0.5">Volume exportado</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{ALL_BACKUP_TYPES.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Tipos exportáveis</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab: Backup */}
      {mode === "backup" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <h2 className="text-lg font-bold text-slate-900">{page.panelTitle}</h2>
            <p className="text-sm text-slate-600">{page.panelDescription}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ALL_BACKUP_TYPES.map(cfg => {
              const Icon = cfg.icon;
              return (
                <Card key={cfg.type} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cfg.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{cfg.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{cfg.description}</p>
                      </div>
                    </div>

                    {(() => {
                      const last = history.find(e => e.type === cfg.type);
                      return last ? (
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>Último: {fmtDateTime(last.exportedAt)}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Nenhum backup gerado ainda</span>
                        </div>
                      );
                    })()}

                    <div className="pt-1">
                      <BackupManager
                        type={cfg.type}
                        label={cfg.label}
                        isAdmin={isAdmin}
                        adminOnly={false}
                        showRestore={false}
                        backupButtonLabel="Gerar PDF"
                        generatedBy={user?.username}
                        onRestored={() => setRefresh(r => r + 1)}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Histórico de Backups</span>
              </div>
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                  Limpar histórico
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="p-10 text-center">
                <Database className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Nenhum backup gerado ainda</p>
                <p className="text-sm text-slate-400 mt-1">Gere um backup acima para registrar o histórico local.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.map(entry => (
                  <HistoryRow key={entry.id} entry={entry} onDelete={() => deleteHistoryEntry(entry.id)} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab: Restauração */}
      {mode === "restore" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <h2 className="text-lg font-bold text-slate-900">{page.panelTitle}</h2>
            <p className="text-sm text-slate-600">{page.panelDescription}</p>
            <p className="mt-2 text-xs font-semibold text-amber-700">PDF é indicado para conferência. Para restauração segura, prefira TXT estruturado ou arquivo técnico restaurável.</p>
            <p className="mt-1 text-xs text-slate-600">Aviso de segurança: confira o preview e confirme o modo de restauração antes de aplicar.</p>
          </div>
          <AssistedRestorePanel modules={ALL_BACKUP_TYPES} onRestored={() => setRefresh(r => r + 1)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ALL_BACKUP_TYPES.map(cfg => {
              const Icon = cfg.icon;
              return (
                <Card key={cfg.type} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cfg.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{cfg.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Importar JSON ou TXT estruturado deste módulo.</p>
                      </div>
                    </div>
                    <BackupManager
                      type={cfg.type}
                      label={cfg.label}
                      isAdmin={isAdmin}
                      adminOnly={false}
                      showBackup={false}
                      onRestored={() => setRefresh(r => r + 1)}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
              <CheckCircle2 className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Histórico de Restaurações</span>
            </div>
            {log.length === 0 ? (
              <div className="p-10 text-center">
                <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Nenhuma restauração realizada ainda</p>
                <p className="text-sm text-slate-400 mt-1">O histórico de restaurações aparecerá aqui automaticamente.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {log.map(entry => (
                  <LogRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab: Exportação */}
      {mode === "exports" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-3">
            <h2 className="text-lg font-bold text-slate-900">{page.panelTitle}</h2>
            <p className="text-sm text-slate-600">{page.panelDescription}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ALL_BACKUP_TYPES.map(cfg => {
              const Icon = cfg.icon;
              return (
                <Card key={cfg.type} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cfg.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{cfg.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{cfg.description}</p>
                      </div>
                    </div>
                    <BackupManager
                      type={cfg.type}
                      label={cfg.label}
                      isAdmin={isAdmin}
                      adminOnly={false}
                      showRestore={false}
                      purpose="export"
                      backupButtonLabel="Baixar PDF"
                      generatedBy={user?.username}
                      onRestored={() => setRefresh(r => r + 1)}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                <div>
                  <p className="text-sm font-bold text-slate-800">Exportação é somente relatório</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Estes PDFs servem para conferência, auditoria e compartilhamento. Para restaurar dados, use a tela Restauração com o arquivo JSON gerado na tela Backup.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export function BackupGenerationPage() {
  return <BackupCenter mode="backup" />;
}

export function BackupExportPage() {
  return <BackupCenter mode="exports" />;
}

export function BackupRestorePage() {
  return <BackupCenter mode="restore" />;
}
