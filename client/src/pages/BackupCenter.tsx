import { useState, useEffect } from "react";
import {
  Database, Upload, Download, Clock, FileText, Trash2,
  RefreshCw, History, CheckCircle2, AlertTriangle, Package, Users,
  Briefcase, ClipboardList, ShoppingCart, Layers, PackageCheck, Shield,
  HardDrive,
  ShieldAlert, Eraser,
} from "lucide-react";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/ui/button";
import BackupManager, {
  getBackupHistory, getRestoreLog, generatePDF, fmtDateTime,
  type BackupType, type BackupHistoryEntry, type RestoreLogEntry,
} from "@/components/BackupManager";
import { CompleteBackupGeneration, PdfBackupRestore } from "@/components/CompleteBackupManager";
import { useUser } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

// ─── Config ───────────────────────────────────────────────────────────────────
const ALL_BACKUP_TYPES: { type: BackupType; label: string; icon: React.ElementType; color: string; description: string }[] = [
  { type: "usuarios", label: "Usuários e Cargos", icon: Users, color: "text-indigo-600 bg-indigo-50 border-indigo-200", description: "Backup técnico com hashes bcrypt" },
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

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

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
  if (d.users?.length) parts.push(`${d.users.length} usuários`);
  if (d.roles?.length) parts.push(`${d.roles.length} cargos`);
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
          onClick={() => reDownloadPDF(entry)}
          className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
          title="Baixar PDF novamente"
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
export type BackupCenterMode = "backup" | "restore" | "exports";

const PAGE_COPY: Record<BackupCenterMode, { title: string; subtitle: string; panelTitle: string; panelDescription: string }> = {
  backup: {
    title: "Backup",
    subtitle: "Gerar cópia segura dos dados",
    panelTitle: "Gerar cópia segura dos dados",
    panelDescription: "Gere ZIP técnico restaurável com manifesto, JSONs, checksums e PDF apenas para conferência.",
  },
  exports: {
    title: "Exportação",
    subtitle: "Baixar relatórios em PDF",
    panelTitle: "Baixar relatórios em PDF",
    panelDescription: "Exportação gera relatórios visuais para conferência. Não gera arquivo técnico de restauração.",
  },
  restore: {
    title: "Restauração",
    subtitle: "Importar PDFs gerados pelo ERP",
    panelTitle: "Importar",
    panelDescription: "",
  },
};

export default function BackupCenter({ mode = "exports" }: { mode?: BackupCenterMode }) {
  const { data: user } = useUser();
  const isAdmin = user?.role === "admin";
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);
  const [log, setLog] = useState<RestoreLogEntry[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [resetToken, setResetToken] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceError, setMaintenanceError] = useState("");
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const now = new Date();
  const [materialPeriod, setMaterialPeriod] = useState<"all" | "year" | "month">("all");
  const [materialYear, setMaterialYear] = useState(String(now.getFullYear()));
  const [materialMonth, setMaterialMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const page = PAGE_COPY[mode];

  const generateFullTechnicalBackup = async () => {
    setMaintenanceLoading(true); setMaintenanceError(""); setMaintenanceMessage("");
    try {
      const response = await apiRequest("GET", "/api/backup/completo");
      const backup = await response.json();
      const token = String(backup.resetToken || "");
      const { resetToken: _resetToken, ...downloadable } = backup;
      const blob = new Blob([JSON.stringify(downloadable, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `Backup_Tecnico_Completo_${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
      setResetToken(token); setMaintenanceMessage("Backup completo baixado. A autorização de limpeza vale por 15 minutos.");
    } catch (err: any) { setMaintenanceError(err.message || "Falha ao gerar backup completo."); }
    finally { setMaintenanceLoading(false); }
  };

  const clearOperationalData = async () => {
    setMaintenanceLoading(true); setMaintenanceError(""); setMaintenanceMessage("");
    try {
      const response = await apiRequest("POST", "/api/maintenance/operational-reset", { resetToken, confirmation: resetConfirmation });
      const result = await response.json();
      setMaintenanceMessage(`${result.message} ${result.deleted || 0} registro(s) removido(s); ${result.preservedUsers || 0} usuário(s) e ${result.preservedRoles || 0} cargo(s) preservado(s).`);
      setResetToken(""); setResetConfirmation(""); queryClient.clear();
    } catch (err: any) { setMaintenanceError(err.message || "A limpeza não foi executada."); }
    finally { setMaintenanceLoading(false); }
  };

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

      {mode !== "restore" && (
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
      )}

      {/* Tab: Backup */}
      {mode === "backup" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <h2 className="text-lg font-bold text-slate-900">{page.panelTitle}</h2>
            <p className="text-sm text-slate-600">{page.panelDescription}</p>
          </div>
          <CompleteBackupGeneration isAdmin={isAdmin} />
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

          <Card className="border-red-200">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div><h3 className="font-bold text-slate-900">Backup Completo Técnico e Limpeza Operacional</h3><p className="mt-1 text-sm text-slate-600">O backup técnico inclui usuários, cargos e hashes bcrypt; nunca inclui senha em texto. A limpeza preserva usuários, cargos e configurações essenciais.</p></div>
              </div>
              <Button type="button" variant="outline" onClick={generateFullTechnicalBackup} disabled={maintenanceLoading}><Download className="mr-2 h-4 w-4" />Baixar Backup Completo Técnico</Button>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-sm font-bold text-red-900">Limpeza Operacional</p>
                <p className="text-xs text-red-800">Remove estoque, movimentações, catálogo, clientes, orçamentos, OS, registros de obra, financeiro, garantias, pós-venda, vendas e controle de materiais. Não executa sem backup completo recém-gerado.</p>
                <input value={resetConfirmation} onChange={event => setResetConfirmation(event.target.value)} placeholder="Digite: LIMPAR DADOS OPERACIONAIS" className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm" />
                <Button type="button" onClick={clearOperationalData} disabled={maintenanceLoading || !resetToken || resetConfirmation !== "LIMPAR DADOS OPERACIONAIS"} className="bg-red-700 text-white hover:bg-red-800"><Eraser className="mr-2 h-4 w-4" />Executar Limpeza Operacional</Button>
              </div>
              {maintenanceError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{maintenanceError}</p>}
              {maintenanceMessage && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{maintenanceMessage}</p>}
            </CardContent>
          </Card>

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
          <PdfBackupRestore isAdmin={isAdmin} username={user?.username || "Admin"} onRestored={() => setRefresh(r => r + 1)} />
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
                      materialFilters={cfg.type === "materiais" ? { period: materialPeriod, year: materialYear, month: materialMonth } : undefined}
                      onRestored={() => setRefresh(r => r + 1)}
                    />
                    {cfg.type === "materiais" && (
                      <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50/70 p-3">
                        <p className="text-xs font-bold uppercase text-amber-700">Período</p>
                        <select value={materialPeriod} onChange={event => setMaterialPeriod(event.target.value as "all" | "year" | "month")} className="h-9 w-full rounded-md border border-amber-200 bg-white px-2 text-xs">
                          <option value="all">Todos os meses</option>
                          <option value="year">Ano específico</option>
                          <option value="month">Mês específico</option>
                        </select>
                        {materialPeriod !== "all" && (
                          <input
                            value={materialYear}
                            onChange={event => setMaterialYear(event.target.value.replace(/\D/g, "").slice(0, 4))}
                            className="h-9 w-full rounded-md border border-amber-200 bg-white px-2 text-xs"
                            placeholder="Ano"
                          />
                        )}
                        {materialPeriod === "month" && (
                          <select value={materialMonth} onChange={event => setMaterialMonth(event.target.value)} className="h-9 w-full rounded-md border border-amber-200 bg-white px-2 text-xs">
                            {MONTHS.map((month, index) => (
                              <option key={month} value={String(index + 1).padStart(2, "0")}>{month}</option>
                            ))}
                          </select>
                        )}
                        <p className="text-[11px] text-amber-800">Baixa PDF e JSON técnico usando a data operacional da retirada ou movimentação.</p>
                      </div>
                    )}
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
                    Estes PDFs servem para conferência, auditoria e compartilhamento. Para restaurar dados, use a tela Restauração com ZIP completo ou JSON técnico modular gerado pelo ERP.
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
