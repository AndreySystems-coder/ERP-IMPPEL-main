import { useMemo, useState } from "react";
import { Archive, CheckCircle2, Download, FileArchive, ShieldAlert, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildCompleteBackupArchive,
  MODULE_LABELS,
  parseCompleteBackupFile,
  parseTechnicalBackupJsonFile,
  TABLE_LABELS,
  type CompleteBackupPackage,
  type RestorePreview,
  type TechnicalBackupPayload,
} from "@/lib/completeBackupArchive";

type PdfRestoreModule = {
  id: string;
  type: "usuarios" | "produtos" | "servicos" | "estoque" | "financeiro" | "clientes" | "orcamentos" | "ordens-servico" | "pos-venda" | "garantias" | "materiais";
  label: string;
};

type PdfRestorePreview = {
  fileName: string;
  selectedType: string;
  reportType: string;
  restoreType?: string;
  title: string;
  headerTotal: number;
  extracted: number;
  newCount: number;
  existingCount: number;
  updatedCount: number;
  ignoredCount: number;
  errorCount: number;
  pendingCount: number;
  duplicateCount: number;
  fullyApplicableCount?: number;
  partiallyApplicableCount?: number;
  blockedCount?: number;
  unresolvedItemCount?: number;
  requiresPartialConfirmation?: boolean;
  warnings: string[];
  ignored: string[];
  pending: string[];
  errors: string[];
  rows: { name: string; detail: string; status: string }[];
  dependencies?: {
    canApply: boolean;
    checks: Array<{
      name: string;
      required: boolean;
      found: number;
      missing: number;
      missingItems: string[];
      message: string;
    }>;
    warnings: string[];
    blockedReasons: string[];
  };
  materialImport?: {
    hash: string;
    summary: {
      total: number;
      ready: number;
      pending: number;
      duplicates: number;
      blocked: number;
      importableRows: number;
      occurrences?: number;
      uniqueMaterials?: number;
      uniqueResponsibleNames?: number;
      unresolvedMaterials?: number;
      unresolvedUsers?: number;
    };
    records: Array<{
      temporaryId: string;
      originalData: { date: string; responsible: string; type: string; notes: string; status: string };
      resolvedUser: { id: number; username: string } | null;
      unresolvedUser: string | null;
      status: "ready" | "pending" | "duplicate" | "blocked";
      duplicate: boolean;
      errors: string[];
      pendingDetails?: Array<{
        originalText: string;
        type: string;
        reason: string;
        candidates: Array<{ label: string; score: number }>;
        action: string;
      }>;
      items: Array<any>;
    }>;
    rows: Array<any>;
    users: Array<{ id: number; username: string; fullName?: string | null }>;
    inventory: Array<{ id: number; name: string; unit?: string | null; quantity?: number | null }>;
    warnings: string[];
  };
  backup?: any;
  canApply: boolean;
};

const PDF_RESTORE_MODULES: PdfRestoreModule[] = [
  { id: "usuarios", type: "usuarios", label: "Usuários e Cargos" },
  { id: "produtos", type: "produtos", label: "Catálogo de Produtos" },
  { id: "servicos", type: "servicos", label: "Catálogo de Serviços" },
  { id: "estoque", type: "estoque", label: "Estoque" },
  { id: "movimentacoes", type: "estoque", label: "Movimentações de Estoque" },
  { id: "materiais", type: "materiais", label: "Controle de Materiais" },
];

type PdfImportHistoryEntry = {
  id: string;
  importedAt: string;
  username: string;
  moduleLabel: string;
  files: string[];
  imported: number;
  ignored: number;
  errors: number;
  status: "Concluído" | "Falhou";
  backupGenerated: boolean;
};

const PDF_IMPORT_HISTORY_KEY = "imppel_pdf_import_history";

function getPdfImportHistory(): PdfImportHistoryEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PDF_IMPORT_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePdfImportHistory(entry: PdfImportHistoryEntry) {
  const history = getPdfImportHistory();
  history.unshift(entry);
  localStorage.setItem(PDF_IMPORT_HISTORY_KEY, JSON.stringify(history.slice(0, 80)));
  return history.slice(0, 80);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const PDF_REPORT_LABELS: Record<string, string> = {
  usuarios: "Usuários e Cargos",
  produtos: "Catálogo de Produtos",
  servicos: "Catálogo de Serviços",
  estoque: "Estoque",
  movimentacoes: "Movimentações de Estoque",
  materiais: "Controle de Materiais",
};

function pdfRestoreLabel(preview: PdfRestorePreview) {
  if (preview.reportType === "materiais" || preview.restoreType === "materiais") return "Controle de Materiais";
  return PDF_REPORT_LABELS[preview.reportType] || PDF_REPORT_LABELS[preview.restoreType || ""] || preview.reportType;
}

export function CompleteBackupGeneration({ isAdmin }: { isAdmin: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const generate = async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/backup/completo", { credentials: "include" });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || "Não foi possível gerar o backup completo.");
      const backup: CompleteBackupPackage = await response.json();
      const archive = await buildCompleteBackupArchive(backup);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(new Blob([archive.bytes], { type: "application/zip" }), `ERP-IMPPEL-backup-completo-${stamp}.zip`);
      setMessage(`Backup completo gerado: ${backup.manifest.includedModules.length} módulos, ${archive.attachmentCount} anexo(s), checksum ${backup.manifest.checksum.value.slice(0, 12)}…`);
    } catch (error: any) {
      setMessage(error.message || "Falha ao gerar backup completo.");
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
              <h2 className="text-base font-bold text-slate-900">Exportação Completa do ERP</h2>
              <p className="mt-1 text-sm text-slate-600">Um ZIP privado com manifesto, checksum e JSON restaurável de todos os módulos.</p>
            </div>
          </div>
          <button type="button" onClick={generate} disabled={!isAdmin || busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <Download className="h-4 w-4" />
            {busy ? "Gerando…" : "Baixar backup completo"}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-slate-700" role="status">{message}</p>}
        <p className="mt-3 text-xs font-medium text-amber-700">Contém dados privados e pode incluir fotos, assinaturas e documentos armazenados no banco. Não envie ao GitHub.</p>
      </CardContent>
    </Card>
  );
}

export function CompleteBackupRestore({ isAdmin, onRestored }: { isAdmin: boolean; onRestored: () => void }) {
  const [backup, setBackup] = useState<CompleteBackupPackage | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [replaceConfirmation, setReplaceConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const total = useMemo(() => selected.reduce((sum, name) => sum + Number(backup?.manifest.counts[name] || 0), 0), [backup, selected]);

  const loadFile = async (file?: File) => {
    if (!file) return;
    setMessage("");
    try {
      const parsed = await parseCompleteBackupFile(file);
      setBackup(parsed);
      setSelected([...parsed.manifest.includedModules]);
      setMode("merge");
      setPreview(null);
      setConfirmation("");
      setReplaceConfirmation("");
    } catch (error: any) {
      setBackup(null);
      setSelected([]);
      setPreview(null);
      setMessage(error.message || "Não foi possível ler o pacote.");
    }
  };

  const buildPreview = async (nextMode = mode, nextSelected = selected) => {
    if (!backup || nextSelected.length === 0) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/backup/preview/completo", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup, modules: nextSelected, mode: nextMode }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Não foi possível gerar o preview.");
      setPreview(result.preview);
    } catch (error: any) {
      setPreview(null);
      setMessage(error.message || "Não foi possível gerar o preview.");
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!backup) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/backup/restore/completo", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup, modules: selected, mode, confirmation, replaceConfirmation }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "A restauração completa falhou.");
      setMessage(`${result.message} ${result.total} registro(s) processado(s).`);
      setPreview(null);
      onRestored();
    } catch (error: any) {
      setMessage(error.message || "A restauração completa falhou.");
    } finally {
      setBusy(false);
    }
  };

  const canRestore = isAdmin && backup && preview && preview.totals.conflictCount === 0 && selected.length > 0 && confirmation === "RESTAURAR ERP" && (mode === "merge" || replaceConfirmation === "SUBSTITUIR MODULOS");

  return (
    <Card className="border-emerald-200">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <FileArchive className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Restaurar pacote completo</h2>
            <p className="mt-1 text-sm text-slate-600">Selecione um ZIP gerado pela Exportação Completa, valide manifesto, checksums e gere o preview antes de aplicar.</p>
          </div>
        </div>

        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center hover:border-emerald-400">
          <Upload className="mb-2 h-5 w-5 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Selecionar ZIP completo</span>
          <input type="file" accept=".zip,application/zip" className="sr-only" onChange={event => loadFile(event.target.files?.[0])} />
        </label>

        {backup && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Criado em</p><p className="mt-1 text-sm font-semibold text-slate-800">{new Date(backup.manifest.createdAt).toLocaleString("pt-BR")}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Ambiente</p><p className="mt-1 text-sm font-semibold text-slate-800">{backup.manifest.environment}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Checksum</p><p className="mt-1 truncate font-mono text-xs font-semibold text-slate-800">{backup.manifest.checksum.value}</p></div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900">Preview do conteúdo</h3>
              <p className="mt-1 text-xs text-slate-500">Quantidades lidas do manifesto. Nenhum dado foi aplicado.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(backup.manifest.tableCounts || {})
                  .filter(([, count]) => Number(count) > 0)
                  .map(([tableName, count]) => (
                    <div key={tableName} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-600">{TABLE_LABELS[tableName] || tableName}</span>
                      <strong className="tabular-nums text-slate-900">{count}</strong>
                    </div>
                  ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(backup.manifest.attachmentCounts || {}).map(([name, count]) => (
                  <span key={name} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">{name}: {count}</span>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {backup.manifest.includedModules.map(moduleName => (
                <label key={moduleName} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <input type="checkbox" checked={selected.includes(moduleName)} onChange={() => { setPreview(null); setSelected(current => current.includes(moduleName) ? current.filter(name => name !== moduleName) : [...current, moduleName]); }} />
                  <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">{MODULE_LABELS[moduleName] || moduleName}</span>
                  <span className="text-xs tabular-nums text-slate-500">{backup.manifest.counts[moduleName] || 0}</span>
                </label>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-lg border-2 p-3 ${mode === "merge" ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                <input type="radio" name="complete-mode" checked={mode === "merge"} onChange={() => { setMode("merge"); setPreview(null); }} className="mr-2" />
                <span className="text-sm font-semibold">Mesclar</span>
                <p className="mt-1 text-xs text-slate-600">Atualiza IDs existentes e adiciona os ausentes em uma transação.</p>
              </label>
              <label className={`cursor-pointer rounded-lg border-2 p-3 ${mode === "replace" ? "border-red-500 bg-red-50" : "border-slate-200"}`}>
                <input type="radio" name="complete-mode" checked={mode === "replace"} onChange={() => { setMode("replace"); setPreview(null); }} className="mr-2" />
                <span className="text-sm font-semibold">Substituir selecionados</span>
                <p className="mt-1 text-xs text-slate-600">Apaga apenas os módulos marcados e restaura seus IDs originais.</p>
              </label>
            </div>

            {mode === "replace" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex gap-2 text-sm text-red-800"><ShieldAlert className="h-4 w-4 shrink-0" /><span>Operação destrutiva limitada aos módulos selecionados. Digite <strong>SUBSTITUIR MODULOS</strong>.</span></div>
                <input value={replaceConfirmation} onChange={event => setReplaceConfirmation(event.target.value)} className="mt-3 w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm" placeholder="SUBSTITUIR MODULOS" />
              </div>
            )}

            <button type="button" onClick={() => buildPreview()} disabled={!isAdmin || busy || selected.length === 0} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900 disabled:opacity-50 sm:w-auto">
              {busy ? "Gerando preview..." : "Gerar preview técnico"}
            </button>

            {preview && <RestorePreviewPanel preview={preview} />}

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">Para aplicar {total} registro(s) dos módulos selecionados após o preview, digite <strong>RESTAURAR ERP</strong>.</p>
              <input value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-3 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm" placeholder="RESTAURAR ERP" />
            </div>

            {(backup.manifest.warnings?.length > 0 || backup.manifest.notIncluded?.length > 0) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                {[...(backup.manifest.warnings || []), ...(backup.manifest.notIncluded || []).map(item => `Não incluído: ${item}`)].map((item, index) => (
                  <p key={`${item}-${index}`} className="mt-1 first:mt-0">• {item}</p>
                ))}
              </div>
            )}

            <button type="button" onClick={restore} disabled={!canRestore || busy} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">
              <CheckCircle2 className="h-4 w-4" />
              {busy ? "Restaurando…" : "Confirmar restauração"}
            </button>
          </>
        )}
        {message && <p className="text-sm text-slate-700" role="status">{message}</p>}
      </CardContent>
    </Card>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o PDF."));
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}

export function PdfBackupRestore({ isAdmin, onRestored, username = "Admin" }: { isAdmin: boolean; onRestored: () => void; username?: string }) {
  const [selectedModuleId, setSelectedModuleId] = useState("usuarios");
  const selectedModule = PDF_RESTORE_MODULES.find(module => module.id === selectedModuleId) || PDF_RESTORE_MODULES[0];
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<PdfRestorePreview[]>([]);
  const [safetyBackup, setSafetyBackup] = useState<CompleteBackupPackage | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<PdfImportHistoryEntry[]>(() => getPdfImportHistory());

  const loadFiles = (list?: FileList | null) => {
    const selected = Array.from(list || []);
    const invalid = selected.find(file => !file.name.toLowerCase().endsWith(".pdf"));
    setMessage("");
    setPreviews([]);
    setSafetyBackup(null);
    setConfirmation("");
    if (invalid) {
      setFiles([]);
      setMessage("Use apenas PDFs gerados pelo ERP.");
      return;
    }
    setFiles(selected);
  };

  const buildPreview = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setMessage("");
    try {
      const payloadFiles = await Promise.all(files.map(async file => ({
        name: file.name,
        mimeType: file.type || "application/pdf",
        dataBase64: await fileToBase64(file),
      })));
      const response = await fetch("/api/backup/preview/pdf", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedType: selectedModule.type, files: payloadFiles }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Não foi possível gerar preview dos PDFs.");
      setPreviews(result.previews || []);
      setSafetyBackup(result.safetyBackup || null);
      setMessage(result.safetyBackup ? "Preview gerado. Backup automático interno gerado." : "Preview gerado, mas o backup automático não foi confirmado.");
    } catch (error: any) {
      setPreviews([]);
      setSafetyBackup(null);
      setMessage(error.message || "Não foi possível gerar preview dos PDFs.");
    } finally {
      setBusy(false);
    }
  };

  const recomputeMaterialPreviewState = (preview: PdfRestorePreview): PdfRestorePreview => {
    if (!preview.materialImport) return preview;
    const rows = preview.materialImport.rows || [];
    const records = preview.materialImport.records.map(record => {
      const recordRows = rows.filter(row => row.sourceRecordId === record.temporaryId);
      const duplicate = recordRows.some(row => row.duplicate);
      const pending = recordRows.some(row =>
        row.status !== "ok" ||
        !row.inventoryId ||
        !row.date ||
        (row.type === "retirada" && !row.userId)
      );
      return {
        ...record,
        items: recordRows,
        resolvedUser: recordRows.find(row => row.userId)?.userId
          ? { id: Number(recordRows.find(row => row.userId)?.userId), username: String(recordRows.find(row => row.userId)?.username || "") }
          : null,
        unresolvedUser: pending && recordRows.some(row => row.type === "retirada" && !row.userId) ? record.originalData.responsible : null,
        status: duplicate ? "duplicate" as const : pending ? "pending" as const : "ready" as const,
        duplicate,
      };
    });
    const importableRows = rows.filter(row => row.status === "ok" && !row.duplicate && row.inventoryId && (row.type !== "retirada" || row.userId)).length;
    const next = {
      ...preview,
      materialImport: {
        ...preview.materialImport,
        records,
        rows,
        summary: {
          ...preview.materialImport.summary,
          ready: records.filter(record => record.status === "ready").length,
          pending: records.filter(record => record.status === "pending").length,
          duplicates: records.filter(record => record.status === "duplicate").length,
          blocked: records.filter(record => record.status === "duplicate").length,
          importableRows,
        },
      },
      canApply: importableRows > 0,
      fullyApplicableCount: records.filter(record => record.status === "ready").length,
      partiallyApplicableCount: records.filter(record => record.status === "pending").length,
      duplicateCount: records.filter(record => record.status === "duplicate").length,
      pendingCount: records.filter(record => record.status === "pending").length,
      unresolvedItemCount: rows.filter(row => !row.inventoryId).length,
    };
    return next;
  };

  const updateMaterialRows = (previewIndex: number, updater: (rows: any[], preview: PdfRestorePreview) => any[]) => {
    setPreviews(current => current.map((preview, index) => {
      if (index !== previewIndex || !preview.materialImport) return preview;
      const rows = updater(preview.materialImport.rows || [], preview);
      return recomputeMaterialPreviewState({
        ...preview,
        materialImport: { ...preview.materialImport, rows },
      });
    }));
  };

  const resolveMaterialRecordUser = (previewIndex: number, recordId: string, userId: string) => {
    updateMaterialRows(previewIndex, (rows, preview) => {
      const user = preview.materialImport?.users.find(candidate => Number(candidate.id) === Number(userId));
      return rows.map(row => row.sourceRecordId === recordId
        ? {
            ...row,
            userId: user ? Number(user.id) : null,
            username: user?.username || null,
            userConfidence: user ? 100 : row.userConfidence,
            status: row.inventoryId && user ? "ok" : "duvidoso",
            warnings: (row.warnings || []).filter((warning: string) => !warning.toLowerCase().includes("funcionário")),
          }
        : row);
    });
  };

  const resolveMaterialItem = (previewIndex: number, rowId: string, inventoryId: string) => {
    updateMaterialRows(previewIndex, (rows, preview) => {
      const item = preview.materialImport?.inventory.find(candidate => Number(candidate.id) === Number(inventoryId));
      return rows.map(row => row.id === rowId
        ? {
            ...row,
            inventoryId: item ? Number(item.id) : null,
            itemName: item?.name || null,
            unit: item?.unit || "unid",
            itemConfidence: item ? 100 : row.itemConfidence,
            status: item && (row.type !== "retirada" || row.userId) ? "ok" : "duvidoso",
            warnings: (row.warnings || []).filter((warning: string) => !warning.toLowerCase().includes("material")),
          }
        : row);
    });
  };

  const restore = async () => {
    const applicable = previews.filter(preview => preview.canApply && preview.backup && preview.restoreType);
    if (!applicable.length) return;
    const allowPartial = confirmation === "IMPORTAR PARCIALMENTE";
    setBusy(true);
    setMessage("");
    try {
      let imported = 0;
      let materialPendingAfterImport = 0;
      const importReports: string[] = [];
      for (const preview of applicable) {
        const startedAt = performance.now();
        const response = await fetch(`/api/backup/restore/${preview.restoreType}?mode=merge`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...preview.backup,
            materialImport: preview.restoreType === "materiais" ? { rows: preview.materialImport?.rows || [] } : undefined,
            allowPartial: allowPartial && preview.requiresPartialConfirmation,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || `Falha ao importar ${preview.fileName}.`);
        imported += Number(result.created || 0) + Number(result.updated || 0) + Number(result.movementsCreated || 0);
        materialPendingAfterImport += Number(result.summary?.pendentesRestantes || result.unresolvedItems || 0);
        const report = result.importReport || result.summary || {};
        importReports.push(`${pdfRestoreLabel(preview)}: ${Number(result.created || 0)} retirada(s), ${Number(result.movementsCreated || 0)} movimento(s), ${Number(report.pendencias || result.summary?.pendentesRestantes || 0)} pendência(s), ${Number(report.duplicados || result.summary?.duplicadosIgnorados || 0)} duplicado(s), ${Math.round(performance.now() - startedAt)} ms.`);
      }
      setHistory(savePdfImportHistory({
        id: Date.now().toString(36),
        importedAt: new Date().toISOString(),
        username,
        moduleLabel: selectedModule.label,
        files: files.map(file => file.name),
        imported,
        ignored: totals.ignoredCount + totals.pendingCount + totals.duplicateCount,
        errors: totals.errorCount,
        status: "Concluído",
        backupGenerated: Boolean(safetyBackup),
      }));
      setMessage(materialPendingAfterImport > 0
        ? `${applicable.length} PDF(s) processado(s). Registros prontos importados; ${materialPendingAfterImport} pendência(s) continuam no preview. ${importReports.join(" ")}`
        : `${applicable.length} PDF(s) importado(s) em modo merge. ${importReports.join(" ")}`);
      setConfirmation("");
      if (materialPendingAfterImport <= 0) {
        setPreviews([]);
        setSafetyBackup(null);
        setFiles([]);
      } else {
        setPreviews(current => current.map(preview => preview.materialImport ? {
          ...preview,
          materialImport: {
            ...preview.materialImport,
            rows: preview.materialImport.rows.map(row => row.status === "ok" && !row.duplicate ? { ...row, duplicate: true, duplicateReason: "Importado nesta confirmação", status: "bloqueado", warnings: [...(row.warnings || []), "Importado nesta confirmação"] } : row),
          },
        } : preview).map(recomputeMaterialPreviewState));
      }
      onRestored();
    } catch (error: any) {
      setHistory(savePdfImportHistory({
        id: Date.now().toString(36),
        importedAt: new Date().toISOString(),
        username,
        moduleLabel: selectedModule.label,
        files: files.map(file => file.name),
        imported: 0,
        ignored: totals.ignoredCount + totals.pendingCount + totals.duplicateCount,
        errors: Math.max(1, totals.errorCount),
        status: "Falhou",
        backupGenerated: Boolean(safetyBackup),
      }));
      setMessage(error.message || "A importação por PDF falhou.");
    } finally {
      setBusy(false);
    }
  };

  const totals = previews.reduce((sum, preview) => ({
    extracted: sum.extracted + preview.extracted,
    newCount: sum.newCount + preview.newCount,
    updatedCount: sum.updatedCount + preview.updatedCount,
    ignoredCount: sum.ignoredCount + preview.ignoredCount,
    errorCount: sum.errorCount + preview.errorCount,
    pendingCount: sum.pendingCount + preview.pendingCount,
    duplicateCount: sum.duplicateCount + preview.duplicateCount,
    fullyApplicableCount: sum.fullyApplicableCount + Number(preview.fullyApplicableCount || 0),
    partiallyApplicableCount: sum.partiallyApplicableCount + Number(preview.partiallyApplicableCount || 0),
    blockedCount: sum.blockedCount + Number(preview.blockedCount || 0),
    unresolvedItemCount: sum.unresolvedItemCount + Number(preview.unresolvedItemCount || 0),
  }), { extracted: 0, newCount: 0, updatedCount: 0, ignoredCount: 0, errorCount: 0, pendingCount: 0, duplicateCount: 0, fullyApplicableCount: 0, partiallyApplicableCount: 0, blockedCount: 0, unresolvedItemCount: 0 });
  const requiresPartialConfirmation = previews.some(preview => preview.requiresPartialConfirmation);
  const expectedConfirmation = requiresPartialConfirmation ? "IMPORTAR PARCIALMENTE" : "IMPORTAR";
  const canRestore = isAdmin && safetyBackup && previews.some(preview => preview.canApply) && confirmation === expectedConfirmation;
  const cancelImport = () => {
    setFiles([]);
    setPreviews([]);
    setSafetyBackup(null);
    setConfirmation("");
    setMessage("");
  };

  return (
    <Card className="border-amber-200">
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start gap-3">
          <FileArchive className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Importar</h2>
            <p className="mt-1 text-sm text-slate-600">Escolha o tipo, anexe PDFs gerados pelo ERP e confira o preview antes de confirmar.</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-slate-900">1. Escolher módulo</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PDF_RESTORE_MODULES.map(module => (
              <button
                key={module.id}
                type="button"
                onClick={() => { setSelectedModuleId(module.id); setPreviews([]); setSafetyBackup(null); setConfirmation(""); }}
                className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${selectedModuleId === module.id ? "border-amber-500 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-700"}`}
              >
                {module.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center hover:border-amber-400">
          <Upload className="mb-2 h-5 w-5 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">2. Selecionar PDF(s) do ERP</span>
          <span className="mt-1 text-xs text-slate-500">{files.length ? `${files.length} arquivo(s) selecionado(s)` : "Apenas .pdf"}</span>
          <input type="file" multiple accept=".pdf,application/pdf" className="sr-only" onChange={event => loadFiles(event.target.files)} />
        </label>

        <button type="button" onClick={buildPreview} disabled={!isAdmin || busy || files.length === 0} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50">
          {busy ? "Lendo PDFs..." : "3. Gerar preview"}
        </button>

        {previews.length > 0 && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-1 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <strong>Módulo selecionado: {selectedModule.label}</strong>
              <span>{files.length} arquivo(s) lido(s)</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
              {[
                ["Extraídos", totals.extracted],
                ["Completos", totals.fullyApplicableCount],
                ["Parciais", totals.partiallyApplicableCount],
                ["Bloqueados", totals.blockedCount],
                ["Itens ausentes", totals.unresolvedItemCount],
                ["Novos", totals.newCount],
                ["Atualiz.", totals.updatedCount],
                ["Ignorados", totals.ignoredCount],
                ["Erros", totals.errorCount],
                ["Duplic.", totals.duplicateCount],
                ["Pendentes", totals.pendingCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-slate-50 p-2 text-center">
                  <p className="text-lg font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            {previews.map((preview, previewIndex) => (
              <div key={preview.fileName} className="rounded-md border border-slate-100">
                <div className="border-b bg-slate-50 px-3 py-2 text-sm">
                  <strong>{preview.fileName}</strong>
                  <span className="ml-2 text-slate-500">Detectado: {pdfRestoreLabel(preview)} · Total PDF: {preview.headerTotal || 0} · Extraído: {preview.extracted}</span>
                  {!preview.canApply && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">bloqueado</span>
                  )}
                </div>
                {(preview.fullyApplicableCount != null || preview.partiallyApplicableCount != null || preview.blockedCount != null) && (
                  <div className="grid gap-2 border-b border-slate-100 bg-white px-3 py-3 text-xs sm:grid-cols-4">
                    <div><strong>{preview.fullyApplicableCount || 0}</strong><p className="text-slate-500">registros completos</p></div>
                    <div><strong>{preview.partiallyApplicableCount || 0}</strong><p className="text-slate-500">registros parciais</p></div>
                    <div><strong>{preview.blockedCount || 0}</strong><p className="text-slate-500">registros bloqueados</p></div>
                    <div><strong>{preview.unresolvedItemCount || 0}</strong><p className="text-slate-500">itens não encontrados</p></div>
                  </div>
                )}
                <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto">
                  {preview.rows.slice(0, 60).map((row, index) => (
                    <div key={`${row.name}-${index}`} className="flex justify-between gap-3 px-3 py-2 text-xs">
                      <span className="font-semibold text-slate-800">{row.name}</span>
                      <span className="text-slate-500">{row.detail}</span>
                      <span className={row.status === "pendente" || row.status === "erro" ? "font-bold text-amber-700" : "text-emerald-700"}>{row.status}</span>
                    </div>
                  ))}
                </div>
                {preview.materialImport && (
                  <div className="space-y-3 border-t border-amber-100 bg-amber-50 px-3 py-3 text-xs text-slate-800">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-2 py-1 font-semibold">Total: {preview.materialImport.summary.total}</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">Prontos: {preview.materialImport.summary.ready}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">Pendentes: {preview.materialImport.summary.pending}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-1 font-semibold text-slate-700">Duplicados: {preview.materialImport.summary.duplicates}</span>
                    </div>
                    <div className="max-h-96 space-y-3 overflow-y-auto">
                      <div className="grid gap-2 rounded-md border border-amber-200 bg-white p-3 sm:grid-cols-5">
                        <div><strong>{preview.materialImport.summary.occurrences || preview.materialImport.rows.length}</strong><p className="text-slate-500">ocorrências avaliadas</p></div>
                        <div><strong>{preview.materialImport.summary.uniqueMaterials || 0}</strong><p className="text-slate-500">materiais únicos</p></div>
                        <div><strong>{preview.materialImport.summary.uniqueResponsibleNames || 0}</strong><p className="text-slate-500">responsáveis</p></div>
                        <div><strong>{preview.materialImport.summary.unresolvedMaterials || 0}</strong><p className="text-slate-500">materiais a confirmar</p></div>
                        <div><strong>{preview.materialImport.summary.unresolvedUsers || 0}</strong><p className="text-slate-500">responsáveis a confirmar</p></div>
                      </div>
                      {preview.materialImport.records.slice(0, 80).map(record => (
                        <div key={record.temporaryId} className="rounded-md border border-amber-200 bg-white p-3">
                          <div className="grid gap-2 sm:grid-cols-5">
                            <div>
                              <p className="font-bold text-slate-900">{record.originalData.date || "Data pendente"}</p>
                              <p className="text-slate-500">{record.originalData.type} · {record.originalData.status || "sem status"}</p>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="font-semibold">Responsável do PDF</p>
                              <p className="text-slate-600">{record.originalData.responsible || "—"}</p>
                            </div>
                            <label className="sm:col-span-2">
                              <span className="font-semibold">Funcionário resolvido</span>
                              <select
                                value={record.items.find(item => item.userId)?.userId || ""}
                                onChange={event => resolveMaterialRecordUser(previewIndex, record.temporaryId, event.target.value)}
                                disabled={record.originalData.type !== "retirada" || record.duplicate}
                                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs disabled:bg-slate-100"
                              >
                                <option value="">{record.originalData.type === "retirada" ? "Selecionar funcionário" : "Não se aplica"}</option>
                                {preview.materialImport?.users.map(user => (
                                  <option key={user.id} value={user.id}>{user.username}{user.fullName ? ` · ${user.fullName}` : ""}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="mt-3 space-y-2">
                            {record.items.map(item => (
                              <div key={item.id} className="grid gap-2 rounded bg-slate-50 p-2 sm:grid-cols-6">
                                <div className="sm:col-span-2">
                                  <p className="font-semibold">{item.quantity}x {item.rawItem}</p>
                                  <p className="text-slate-500">{item.warnings?.join(" · ") || "Resolvido"}</p>
                                </div>
                                <label className="sm:col-span-3">
                                  <span className="font-semibold">Material do estoque</span>
                                  <select
                                    value={item.inventoryId || ""}
                                    onChange={event => resolveMaterialItem(previewIndex, item.id, event.target.value)}
                                    disabled={record.duplicate}
                                    className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs disabled:bg-slate-100"
                                  >
                                    <option value="">Selecionar material</option>
                                    {preview.materialImport?.inventory.map(inventoryItem => (
                                      <option key={inventoryItem.id} value={inventoryItem.id}>{inventoryItem.name} · disp. {inventoryItem.quantity ?? 0} {inventoryItem.unit || "un"}</option>
                                    ))}
                                  </select>
                                </label>
                                <div>
                                  <p className="font-semibold">Status</p>
                                  <p className={record.duplicate ? "font-bold text-slate-600" : item.status === "ok" ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>
                                    {record.duplicate ? "Duplicado" : item.status === "ok" ? "Pronto" : "Pendente"}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {record.pendingDetails && record.pendingDetails.length > 0 && (
                            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2">
                              <p className="font-bold text-amber-900">Pendências deste registro</p>
                              <div className="mt-2 space-y-2">
                                {record.pendingDetails.map((detail, index) => (
                                  <div key={`${detail.originalText}-${index}`} className="rounded bg-white p-2">
                                    <p><strong>Texto original:</strong> {detail.originalText || "—"}</p>
                                    <p><strong>Tipo:</strong> {detail.type}</p>
                                    <p><strong>Motivo:</strong> {detail.reason}</p>
                                    <p><strong>Ação sugerida:</strong> {detail.action}</p>
                                    <p><strong>Possíveis correspondências:</strong> {detail.candidates.length ? detail.candidates.map(candidate => `${candidate.label} (${candidate.score})`).join(" · ") : "nenhuma correspondência segura"}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {preview.dependencies && (
                  <div className="border-t border-blue-100 bg-blue-50 px-3 py-3 text-xs text-blue-950">
                    <h4 className="font-bold">Dependências encontradas</h4>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {preview.dependencies.checks.map(check => (
                        <div key={check.name} className="rounded-md border border-blue-100 bg-white p-2">
                          <div className="flex items-center justify-between gap-2">
                            <strong>{check.name}{check.required ? " *" : ""}</strong>
                            <span className={check.missing > 0 ? "font-bold text-red-700" : "font-bold text-emerald-700"}>
                              {check.found} encontrado(s) · {check.missing} ausente(s)
                            </span>
                          </div>
                          <p className="mt-1 text-blue-800">{check.message}</p>
                          {check.missingItems.length > 0 && (
                            <textarea
                              readOnly
                              value={check.missingItems.join("\n")}
                              className="mt-2 h-16 w-full resize-none rounded border border-blue-100 bg-slate-50 p-2 font-mono text-[11px] text-slate-700"
                              aria-label={`Lista de pendências de ${check.name}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    {preview.dependencies.warnings.map((warning, index) => (
                      <p key={`${warning}-${index}`} className="mt-2 font-medium text-amber-800">{warning}</p>
                    ))}
                  </div>
                )}
                {(preview.pending.length > 0 || preview.ignored.length > 0 || preview.errors.length > 0) && (
                  <details className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <summary className="cursor-pointer font-bold">
                      Pendentes, rejeitados e ignorados ({preview.pending.length + preview.ignored.length + preview.errors.length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {[
                        ["Erros", preview.errors],
                        ["Pendentes", preview.pending],
                        ["Ignorados", preview.ignored],
                      ].map(([label, items]) => Array.isArray(items) && items.length > 0 && (
                        <div key={label as string}>
                          <p className="font-semibold">{label as string}</p>
                          {(items as string[]).map((item, index) => (
                            <p key={`${label}-${index}`} className="mt-1 rounded bg-white px-2 py-1">
                              <span className="font-semibold">Módulo:</span> {pdfRestoreLabel(preview)} · <span className="font-semibold">Registro:</span> {item}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {[...preview.warnings, ...preview.errors, ...preview.pending.slice(0, 5), ...preview.ignored.slice(0, 5)].length > 0 && (
                  <div className="space-y-1 border-t border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    {[...preview.warnings, ...preview.errors, ...preview.pending.slice(0, 5), ...preview.ignored.slice(0, 5)].map((item, index) => <p key={index}>{item}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {previews.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-900">
              {requiresPartialConfirmation
                ? <>Serão importados {totals.fullyApplicableCount} registro(s) completo(s) e {totals.partiallyApplicableCount} parcial(is). {totals.blockedCount} registro(s) serão bloqueado(s), com {totals.unresolvedItemCount} item(ns) não encontrado(s). Para confirmar, digite <strong>IMPORTAR PARCIALMENTE</strong>.</>
                : <>Para confirmar a importação em merge, digite <strong>IMPORTAR</strong>.</>}
            </p>
            <input value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-3 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm" placeholder={expectedConfirmation} />
          </div>
        )}

        {previews.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={restore} disabled={!canRestore || busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" />
              {busy ? "Importando..." : "Confirmar importação"}
            </button>
            <button type="button" onClick={cancelImport} disabled={busy} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              Cancelar
            </button>
          </div>
        )}
        {message && <p className="text-sm text-slate-700" role="status">{message}</p>}

        <div className="rounded-lg border border-slate-200">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
            <h3 className="text-sm font-bold text-slate-900">Histórico</h3>
          </div>
          {history.length === 0 ? (
            <p className="px-3 py-5 text-sm text-slate-500">Nenhuma importação registrada ainda.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map(entry => (
                <div key={entry.id} className="grid gap-2 px-3 py-3 text-xs sm:grid-cols-7">
                  <span className="font-semibold text-slate-800">{new Date(entry.importedAt).toLocaleString("pt-BR")}</span>
                  <span>{entry.username}</span>
                  <span>{entry.moduleLabel}</span>
                  <span className="truncate" title={entry.files.join(", ")}>{entry.files.join(", ")}</span>
                  <span>{entry.imported} importado(s)</span>
                  <span>{entry.ignored} ignorado(s) · {entry.errors} erro(s)</span>
                  <span className={entry.status === "Concluído" ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                    {entry.status}{entry.backupGenerated ? " · backup OK" : " · sem backup"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RestorePreviewPanel({ preview }: { preview: RestorePreview }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold text-slate-900">Preview técnico da restauração</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Novos", preview.totals.newCount],
          ["Atualizados", preview.totals.updatedCount],
          ["Duplicados", preview.totals.duplicateCount],
          ["Ignorados", preview.totals.ignoredCount],
          ["Conflitos", preview.totals.conflictCount],
          ["Entrada", preview.totals.incoming],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-slate-50 p-2 text-center">
            <p className="text-lg font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-slate-100">
        {preview.tables.map(table => (
          <div key={table.table} className="grid gap-2 border-b border-slate-100 px-3 py-2 text-xs last:border-b-0 sm:grid-cols-7">
            <strong className="text-slate-800">{TABLE_LABELS[table.table] || table.table}</strong>
            <span>Atual: {table.current}</span>
            <span>Entrada: {table.incoming}</span>
            <span>Novos: {table.newCount}</span>
            <span>Atualiz.: {table.updatedCount}</span>
            <span>Duplic.: {table.duplicateCount}</span>
            <span className={table.conflictCount ? "font-bold text-red-700" : "text-slate-500"}>Conflitos: {table.conflictCount}</span>
          </div>
        ))}
      </div>
      {preview.relationships.length > 0 && <p className="mt-3 text-xs text-slate-600">Relacionamentos validados: {preview.relationships.join(" · ")}</p>}
      {preview.totals.conflictCount > 0 && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {preview.tables.flatMap(table => table.conflicts).slice(0, 10).map((item, index) => <p key={index}>{item}</p>)}
        </div>
      )}
    </div>
  );
}

export function ModularBackupRestore({ isAdmin, onRestored }: { isAdmin: boolean; onRestored: () => void }) {
  const [payload, setPayload] = useState<TechnicalBackupPayload | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [confirmation, setConfirmation] = useState("");
  const [replaceConfirmation, setReplaceConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadFile = async (file?: File) => {
    if (!file) return;
    setMessage("");
    try {
      const parsed = await parseTechnicalBackupJsonFile(file);
      setPayload(parsed);
      setPreview(null);
      setConfirmation("");
      setReplaceConfirmation("");
    } catch (error: any) {
      setPayload(null);
      setPreview(null);
      setMessage(error.message || "Não foi possível ler o JSON técnico.");
    }
  };

  const buildPreview = async () => {
    if (!payload) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/backup/preview/modular", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup: payload, mode }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Não foi possível gerar o preview modular.");
      setPreview(result.preview);
    } catch (error: any) {
      setPreview(null);
      setMessage(error.message || "Não foi possível gerar o preview modular.");
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!payload) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/backup/restore/modular", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup: payload, mode, confirmation, replaceConfirmation }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "A importação modular falhou.");
      setMessage(`${result.message} ${result.total} registro(s) processado(s).`);
      setPreview(null);
      onRestored();
    } catch (error: any) {
      setMessage(error.message || "A importação modular falhou.");
    } finally {
      setBusy(false);
    }
  };

  const canRestore = isAdmin && payload && preview && preview.totals.conflictCount === 0 && confirmation === "RESTAURAR MODULO" && (mode === "merge" || replaceConfirmation === "SUBSTITUIR MODULO");

  return (
    <Card className="border-blue-200">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <Upload className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Importação modular por JSON técnico</h2>
            <p className="mt-1 text-sm text-slate-600">Aceita somente JSON técnico gerado dentro do ZIP do ERP. O módulo é detectado pelo campo técnico do arquivo.</p>
          </div>
        </div>

        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center hover:border-blue-400">
          <Upload className="mb-2 h-5 w-5 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Selecionar JSON técnico modular</span>
          <input type="file" accept=".json,application/json" className="sr-only" onChange={event => loadFile(event.target.files?.[0])} />
        </label>

        {payload && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Tipo detectado</p><p className="mt-1 text-sm font-semibold text-slate-800">{payload.type}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Módulo</p><p className="mt-1 text-sm font-semibold text-slate-800">{MODULE_LABELS[payload.module] || payload.module}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Tabelas</p><p className="mt-1 truncate text-sm font-semibold text-slate-800">{payload.tables.join(", ")}</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-lg border-2 p-3 ${mode === "merge" ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                <input type="radio" name="modular-mode" checked={mode === "merge"} onChange={() => { setMode("merge"); setPreview(null); }} className="mr-2" />
                <span className="text-sm font-semibold">Mesclar</span>
              </label>
              <label className={`cursor-pointer rounded-lg border-2 p-3 ${mode === "replace" ? "border-red-500 bg-red-50" : "border-slate-200"}`}>
                <input type="radio" name="modular-mode" checked={mode === "replace"} onChange={() => { setMode("replace"); setPreview(null); }} className="mr-2" />
                <span className="text-sm font-semibold">Substituir módulo</span>
              </label>
            </div>
            <button type="button" onClick={buildPreview} disabled={busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900 disabled:opacity-50">
              {busy ? "Gerando preview..." : "Gerar preview modular"}
            </button>
            {preview && <RestorePreviewPanel preview={preview} />}
            {mode === "replace" && (
              <input value={replaceConfirmation} onChange={event => setReplaceConfirmation(event.target.value)} className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm" placeholder="SUBSTITUIR MODULO" />
            )}
            <input value={confirmation} onChange={event => setConfirmation(event.target.value)} className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm" placeholder="RESTAURAR MODULO" />
            <button type="button" onClick={restore} disabled={!canRestore || busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Confirmar importação modular
            </button>
          </>
        )}
        {message && <p className="text-sm text-slate-700" role="status">{message}</p>}
      </CardContent>
    </Card>
  );
}
