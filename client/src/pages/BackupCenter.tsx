import { useState, useEffect } from "react";
import {
  Database, Download, Upload, Clock, FileJson, FileText, Trash2,
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

// ─── Config ───────────────────────────────────────────────────────────────────
const ALL_BACKUP_TYPES: { type: BackupType; label: string; icon: React.ElementType; color: string; description: string }[] = [
  { type: "estoque", label: "Estoque", icon: Package, color: "text-blue-600 bg-blue-50 border-blue-200", description: "Itens e movimentações" },
  { type: "produtos", label: "Catálogo de Produtos", icon: ShoppingCart, color: "text-emerald-600 bg-emerald-50 border-emerald-200", description: "Produtos do catálogo de vendas" },
  { type: "servicos", label: "Catálogo de Serviços", icon: Layers, color: "text-violet-600 bg-violet-50 border-violet-200", description: "Serviços com custos e margens" },
  { type: "materiais", label: "Controle de Materiais", icon: PackageCheck, color: "text-amber-600 bg-amber-50 border-amber-200", description: "Retiradas e consumo de obra" },
  { type: "clientes", label: "Clientes", icon: Users, color: "text-sky-600 bg-sky-50 border-sky-200", description: "Cadastro completo de clientes" },
  { type: "orcamentos", label: "Orçamentos", icon: Briefcase, color: "text-orange-600 bg-orange-50 border-orange-200", description: "Orçamentos e negociações" },
  { type: "ordens-servico", label: "Ordens de Serviço", icon: ClipboardList, color: "text-rose-600 bg-rose-50 border-rose-200", description: "Ordens de execução de obras" },
  { type: "garantias", label: "Garantias", icon: Shield, color: "text-teal-600 bg-teal-50 border-teal-200", description: "Garantias e certificados emitidos" },
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BackupCenter() {
  const { data: user } = useUser();
  const isAdmin = user?.role === "admin";
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);
  const [log, setLog] = useState<RestoreLogEntry[]>([]);
  const [tab, setTab] = useState<"backup" | "history" | "log">("backup");
  const [refresh, setRefresh] = useState(0);

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
            Backups & Restauração
          </h1>
          <p className="text-slate-500 mt-1">Gere, gerencie e restaure backups de todos os módulos do sistema.</p>
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
            <p className="text-xs text-slate-500 mt-0.5">Backups no histórico</p>
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
            <p className="text-xs text-slate-500 mt-0.5">Tamanho total (local)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{ALL_BACKUP_TYPES.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Módulos disponíveis</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(["backup", "history", "log"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t === "backup" && "📦 Gerar Backups"}
            {t === "history" && `📂 Histórico (${history.length})`}
            {t === "log" && `📋 Log de Restaurações (${log.length})`}
          </button>
        ))}
      </div>

      {/* Tab: Gerar Backups */}
      {tab === "backup" && (
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

                  {/* Last backup info */}
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
                      onRestored={() => setRefresh(r => r + 1)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tab: Histórico */}
      {tab === "history" && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Histórico de Backups Gerados</span>
            </div>
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                Limpar histórico
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="p-12 text-center">
              <Database className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhum backup gerado ainda</p>
              <p className="text-sm text-slate-400 mt-1">Gere um backup na aba "Gerar Backups" para vê-lo aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map(entry => (
                <HistoryRow key={entry.id} entry={entry} onDelete={() => deleteHistoryEntry(entry.id)} />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Log de Restaurações */}
      {tab === "log" && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
            <CheckCircle2 className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Log de Restaurações</span>
          </div>
          {log.length === 0 ? (
            <div className="p-12 text-center">
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
      )}
    </div>
  );
}
