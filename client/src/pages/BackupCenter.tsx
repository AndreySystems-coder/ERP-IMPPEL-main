import { useState, useEffect } from "react";
import { zipSync } from "fflate";
import {
  Database, Clock, FileText, Trash2,
  RefreshCw, History, AlertTriangle,
  HardDrive, Archive, Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/Card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import BackupManager, {
  getBackupHistory, getRestoreLog, generatePDF, generatePDFBytes, backupPdfFileName, buildOperationalUsersBackup, fmtDateTime,
  type BackupHistoryEntry, type RestoreLogEntry,
} from "@/components/BackupManager";
import { PdfBackupRestore } from "@/components/CompleteBackupManager";
import { ALL_BACKUP_TYPES } from "@/lib/backupModules";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";

const MODE_LABEL: Record<string, string> = {
  merge: "Merge",
  overwrite: "Sobrescrita",
};

const BACKUP_COVERAGE = [
  ["Usuários, cargos e permissões", "Sim", "PDF operacional", "PDF/backup técnico", "Restaurar antes dos módulos com responsáveis."],
  ["Clientes, leads, CRM e follow-ups", "Sim", "Parcial por PDF/relatórios", "Backup completo", "Clientes e leads antes de orçamentos."],
  ["Produtos e serviços", "Sim", "PDF", "PDF/backup técnico", "Base do orçamento, estoque e restauração de materiais."],
  ["Estoque, ferramentas e movimentações", "Sim", "PDF", "PDF/backup técnico", "Produtos/serviços devem existir antes."],
  ["Controle de materiais, custódias e devoluções", "Sim", "PDF", "PDF/backup técnico", "Usuários e estoque devem existir antes."],
  ["Orçamentos, OS e registros de obra", "Sim", "PDF/relatório quando disponível", "Backup completo", "Clientes, produtos e serviços antes."],
  ["Financeiro, garantias e pós-venda", "Sim", "PDF/relatório quando disponível", "Backup completo", "Depende de clientes, orçamentos e OS."],
  ["Governança, qualidade, marketing e identidade visual", "Sim", "Relatório/backup técnico", "Backup completo", "Módulos das Etapas 4 a 8 ficam no backup técnico."],
];

function reDownloadPDF(entry: BackupHistoryEntry) {
  generatePDF(entry.type, entry.backup);
}

// ─── Download all as ZIP ─────────────────────────────────────────────────────
function DownloadAllZipCard({ username }: { username?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const downloadAll = async () => {
    setBusy(true);
    setMessage("");
    try {
      const files: Record<string, Uint8Array> = {};
      for (const cfg of ALL_BACKUP_TYPES) {
        const response = await apiRequest("GET", `/api/backup/${cfg.type}`);
        const backup = await response.json();
        const downloadableBackup = cfg.type === "usuarios" ? buildOperationalUsersBackup(backup) : backup;
        files[backupPdfFileName(cfg.type)] = generatePDFBytes(cfg.type, downloadableBackup, { generatedBy: username });
      }
      const zipped = zipSync(files, { level: 6 });
      const blob = new Blob([zipped], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `ERP-IMPPEL-backups-pdf-${stamp}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`ZIP gerado com ${ALL_BACKUP_TYPES.length} PDFs, um por módulo.`);
    } catch (error: any) {
      setMessage(error.message || "Não foi possível gerar o ZIP com todos os PDFs.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-blue-200">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Baixar tudo em um ZIP</h2>
              <p className="mt-1 text-sm text-slate-600">Um PDF de cada módulo, compactados em um único arquivo — para guardar ou restaurar depois no Passo 2.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadAll}
            disabled={busy}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {busy ? "Gerando…" : "Baixar ZIP com todos os PDFs"}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-slate-700" role="status">{message}</p>}
      </CardContent>
    </Card>
  );
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
export type BackupCenterMode = "backup" | "restore";

const PAGE_COPY: Record<BackupCenterMode, { title: string; subtitle: string; panelTitle: string; panelDescription: string }> = {
  backup: {
    title: "Backup",
    subtitle: "Gerar PDF por módulo",
    panelTitle: "Gerar PDF por módulo",
    panelDescription: "Um PDF por módulo, para conferência e para restaurar depois no Passo 2.",
  },
  restore: {
    title: "Restauração",
    subtitle: "Importar PDFs gerados pelo ERP",
    panelTitle: "Importar",
    panelDescription: "",
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
          <DownloadAllZipCard username={user?.username} />
          <TechnicalCoverageDetails />
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
          <Card>
            <CardContent className="space-y-2 p-5 text-sm text-slate-600">
              <p className="font-bold text-slate-900">Como restaurar com segurança</p>
              <p>1. Confirme se o banco é Desenvolvimento, Replit ou Produção antes de importar.</p>
              <p>2. Gere backup antes de qualquer restauração.</p>
              <p>3. Use preview, confira conflitos e confirme somente o que estiver seguro.</p>
              <p>4. PDFs restauram apenas os módulos declarados; módulos novos das Etapas 4 a 8 ficam no backup técnico completo.</p>
            </CardContent>
          </Card>
          <TechnicalCoverageDetails />
          <PdfBackupRestore isAdmin={isAdmin} username={user?.username || "Admin"} onRestored={() => setRefresh(r => r + 1)} />
        </div>
      )}
    </div>
  );
}

function BackupCoverageMatrix() {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Matriz de cobertura do backup</h3>
          <p className="text-sm text-slate-600">Resumo operacional das Etapas 1 a 8. O backup técnico completo é a fonte restaurável mais abrangente; PDF é conferência ou importação apenas quando o módulo declara suporte.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Módulo</th>
                <th className="px-3 py-2">Backup completo</th>
                <th className="px-3 py-2">Exportação simples</th>
                <th className="px-3 py-2">Restauração</th>
                <th className="px-3 py-2">Dependência</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {BACKUP_COVERAGE.map(([module, full, exportMode, restoreMode, dependency]) => (
                <tr key={module}>
                  <td className="px-3 py-2 font-medium text-slate-800">{module}</td>
                  <td className="px-3 py-2">{full}</td>
                  <td className="px-3 py-2">{exportMode}</td>
                  <td className="px-3 py-2">{restoreMode}</td>
                  <td className="px-3 py-2 text-slate-600">{dependency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TechnicalCoverageDetails() {
  return (
    <Accordion type="single" collapsible className="rounded-xl border bg-white px-4">
      <AccordionItem value="coverage" className="border-none">
        <AccordionTrigger className="text-sm font-semibold text-slate-800">Detalhes técnicos e cobertura do backup</AccordionTrigger>
        <AccordionContent>
          <BackupCoverageMatrix />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function BackupGenerationPage() {
  return <BackupCenter mode="backup" />;
}

export function BackupRestorePage() {
  return <BackupCenter mode="restore" />;
}
