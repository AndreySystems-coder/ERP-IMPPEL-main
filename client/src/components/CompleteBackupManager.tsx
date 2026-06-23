import { useMemo, useState } from "react";
import { Archive, CheckCircle2, Download, FileArchive, ShieldAlert, Upload } from "lucide-react";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { Card, CardContent } from "@/components/ui/card";

type CompleteBackupPackage = {
  type: "erp-completo";
  version: string;
  exportedAt: string;
  manifest: {
    format: string;
    version: string;
    createdAt: string;
    environment: string;
    includedModules: string[];
    notIncluded: string[];
    counts: Record<string, number>;
    attachmentCounts: Record<string, number>;
    checksum: { algorithm: string; value: string; scope: string };
    warnings: string[];
  };
  data: Record<string, Record<string, unknown[]>>;
};

const MODULE_LABELS: Record<string, string> = {
  usuarios: "Usuários e cargos",
  clientes: "Clientes",
  leads: "Leads",
  orcamentos: "Orçamentos",
  ordensServico: "Ordens de serviço",
  registrosObra: "Registros de obra e produção",
  controleMateriais: "Controle de materiais",
  estoque: "Estoque e movimentações",
  catalogoMateriais: "Catálogo de materiais/produtos",
  catalogoServicos: "Catálogo de serviços",
  financeiro: "Financeiro",
  garantias: "Garantias, incidentes e contratos",
  posVenda: "Pós-venda e NPS",
  configuracoes: "Configurações e templates",
  formasPagamento: "Formas de pagamento",
  condicoesPagamento: "Condições de pagamento",
};

const MODULE_FILES: Record<string, string> = {
  usuarios: "usuarios-cargos.json",
  clientes: "clientes.json",
  leads: "leads.json",
  orcamentos: "orcamentos.json",
  ordensServico: "ordens-servico.json",
  registrosObra: "registros-obra.json",
  controleMateriais: "controle-materiais.json",
  estoque: "estoque-movimentacoes.json",
  catalogoMateriais: "catalogo-materiais.json",
  catalogoServicos: "catalogo-servicos.json",
  financeiro: "financeiro.json",
  garantias: "garantias-contratos.json",
  posVenda: "pos-venda.json",
  configuracoes: "configuracoes-templates.json",
  formasPagamento: "formas-pagamento.json",
  condicoesPagamento: "condicoes-pagamento.json",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function parsePackage(file: File): Promise<CompleteBackupPackage> {
  if (file.name.toLowerCase().endsWith(".zip")) {
    const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const packageFile = files["ERP-IMPPEL-backup-completo.json"];
    if (!packageFile) throw new Error("O ZIP não contém o arquivo técnico completo do ERP.");
    return JSON.parse(strFromU8(packageFile));
  }
  return JSON.parse(await file.text());
}

function validatePackage(value: any): asserts value is CompleteBackupPackage {
  if (value?.type !== "erp-completo" || value?.manifest?.format !== "imppel-erp-complete-backup" || !value?.data) {
    throw new Error("Arquivo inválido: manifesto completo do ERP não encontrado.");
  }
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
      validatePackage(backup);
      const files: Record<string, Uint8Array> = {
        "manifest.json": strToU8(JSON.stringify(backup.manifest, null, 2)),
        "ERP-IMPPEL-backup-completo.json": strToU8(JSON.stringify(backup, null, 2)),
        "LEIA-ME.txt": strToU8([
          "BACKUP COMPLETO ERP IMPPEL",
          "Arquivo privado. Nao envie ao GitHub.",
          "Para restaurar, envie este ZIP em Backups > Restauracao.",
          "PDFs baixados anteriormente nao fazem parte deste pacote, salvo quando estavam armazenados no banco.",
        ].join("\r\n")),
      };
      for (const moduleName of backup.manifest.includedModules) {
        files[`modulos/${MODULE_FILES[moduleName] || `${moduleName}.json`}`] = strToU8(JSON.stringify(backup.data[moduleName] || {}, null, 2));
      }
      const zipped = zipSync(files, { level: 6 });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(new Blob([zipped], { type: "application/zip" }), `ERP-IMPPEL-backup-completo-${stamp}.zip`);
      setMessage(`Backup completo gerado: ${backup.manifest.includedModules.length} módulos, checksum ${backup.manifest.checksum.value.slice(0, 12)}…`);
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
  const [confirmation, setConfirmation] = useState("");
  const [replaceConfirmation, setReplaceConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const total = useMemo(() => selected.reduce((sum, name) => sum + Number(backup?.manifest.counts[name] || 0), 0), [backup, selected]);

  const loadFile = async (file?: File) => {
    if (!file) return;
    setMessage("");
    try {
      const parsed = await parsePackage(file);
      validatePackage(parsed);
      setBackup(parsed);
      setSelected([...parsed.manifest.includedModules]);
      setMode("merge");
      setConfirmation("");
      setReplaceConfirmation("");
    } catch (error: any) {
      setBackup(null);
      setSelected([]);
      setMessage(error.message || "Não foi possível ler o pacote.");
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
      onRestored();
    } catch (error: any) {
      setMessage(error.message || "A restauração completa falhou.");
    } finally {
      setBusy(false);
    }
  };

  const canRestore = isAdmin && backup && selected.length > 0 && confirmation === "RESTAURAR ERP" && (mode === "merge" || replaceConfirmation === "SUBSTITUIR MODULOS");

  return (
    <Card className="border-emerald-200">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <FileArchive className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Restaurar pacote completo</h2>
            <p className="mt-1 text-sm text-slate-600">Selecione um ZIP ou JSON gerado pela Exportação Completa, revise o manifesto e escolha os módulos.</p>
          </div>
        </div>

        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center hover:border-emerald-400">
          <Upload className="mb-2 h-5 w-5 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Selecionar ZIP ou JSON completo</span>
          <input type="file" accept=".zip,.json,application/zip,application/json" className="sr-only" onChange={event => loadFile(event.target.files?.[0])} />
        </label>

        {backup && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Criado em</p><p className="mt-1 text-sm font-semibold text-slate-800">{new Date(backup.manifest.createdAt).toLocaleString("pt-BR")}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Ambiente</p><p className="mt-1 text-sm font-semibold text-slate-800">{backup.manifest.environment}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Checksum</p><p className="mt-1 truncate font-mono text-xs font-semibold text-slate-800">{backup.manifest.checksum.value}</p></div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {backup.manifest.includedModules.map(moduleName => (
                <label key={moduleName} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <input type="checkbox" checked={selected.includes(moduleName)} onChange={() => setSelected(current => current.includes(moduleName) ? current.filter(name => name !== moduleName) : [...current, moduleName])} />
                  <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">{MODULE_LABELS[moduleName] || moduleName}</span>
                  <span className="text-xs tabular-nums text-slate-500">{backup.manifest.counts[moduleName] || 0}</span>
                </label>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-lg border-2 p-3 ${mode === "merge" ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                <input type="radio" name="complete-mode" checked={mode === "merge"} onChange={() => setMode("merge")} className="mr-2" />
                <span className="text-sm font-semibold">Mesclar</span>
                <p className="mt-1 text-xs text-slate-600">Atualiza IDs existentes e adiciona os ausentes em uma transação.</p>
              </label>
              <label className={`cursor-pointer rounded-lg border-2 p-3 ${mode === "replace" ? "border-red-500 bg-red-50" : "border-slate-200"}`}>
                <input type="radio" name="complete-mode" checked={mode === "replace"} onChange={() => setMode("replace")} className="mr-2" />
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

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">Para aplicar {total} registro(s) dos módulos selecionados, digite <strong>RESTAURAR ERP</strong>.</p>
              <input value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-3 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm" placeholder="RESTAURAR ERP" />
            </div>

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
