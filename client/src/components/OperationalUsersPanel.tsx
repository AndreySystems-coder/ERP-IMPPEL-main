import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AlertTriangle, CheckCircle2, Download, FileJson, FileText, Upload, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { parseOperationalEmployeesText, type OperationalEmployeeInput } from "@shared/operationalUsers";

type PreviewRow = { row: number; login?: string; senhaInicial?: string; nomeCompleto?: string; cargo?: string; perfil?: string; status?: string; valid: boolean; action: string; message: string };
type OperationalExportRow = { login: string; senhaInicial: string; nomeCompleto: string; cargo: string; perfil: string; status: string; trocaPendente: boolean };

function downloadJson(fileName: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url);
}

function parseImportValue(value: string): OperationalEmployeeInput[] {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Informe ao menos um funcionário.");
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.data) ? parsed.data : Array.isArray(parsed.employees) ? parsed.employees : null;
    if (!rows) throw new Error("JSON operacional inválido.");
    return rows.map((row: any) => ({ nomeCompleto: row.nomeCompleto, dataNascimento: row.dataNascimento || (row.senhaInicial ? `${String(row.senhaInicial).slice(0, 2)}/${String(row.senhaInicial).slice(2, 4)}/${String(row.senhaInicial).slice(4)}` : ""), cargo: row.cargo, perfil: row.perfil, status: row.status, login: row.login, senhaInicial: row.senhaInicial }));
  }
  return parseOperationalEmployeesText(trimmed);
}

export default function OperationalUsersPanel() {
  const [text, setText] = useState("");
  const [employees, setEmployees] = useState<OperationalEmployeeInput[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [resetPasswords, setResetPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const buildPreview = async () => {
    setError(""); setMessage(""); setLoading(true);
    try { const parsed = parseImportValue(text); const response = await apiRequest("POST", "/api/users/operational/preview", { employees: parsed }); const data = await response.json(); setEmployees(parsed); setPreview(data.rows || []); setSummary(data.summary || null); }
    catch (err: any) { setError(err.message || "Não foi possível gerar o preview."); } finally { setLoading(false); }
  };

  const applyImport = async () => {
    if (!preview.length || preview.some(row => !row.valid)) return setError("Corrija os erros do preview antes de importar.");
    setError(""); setMessage(""); setLoading(true);
    try { const response = await apiRequest("POST", "/api/users/operational/apply", { employees, confirmed: true, updateExisting, resetPasswords }); const result = await response.json(); setMessage(`${result.created || 0} criado(s), ${result.existing || 0} existente(s), ${result.updated || 0} atualizado(s), ${(result.errors || []).length} erro(s).`); await queryClient.invalidateQueries({ queryKey: ["/api/users"] }); await queryClient.invalidateQueries({ queryKey: ["/api/roles"] }); }
    catch (err: any) { setError(err.message || "Falha ao importar usuários."); } finally { setLoading(false); }
  };

  const loadReport = async () => (await apiRequest("GET", "/api/users/operational/export")).json() as Promise<{ exportedAt: string; data: OperationalExportRow[] }>;
  const exportJson = async () => { try { const report = await loadReport(); downloadJson(`Usuarios_Operacionais_${new Date().toISOString().slice(0, 10)}.json`, report.data); setMessage("JSON operacional exportado. Guarde-o em local administrativo seguro."); } catch (err: any) { setError(err.message); } };
  const exportPdf = async () => {
    try {
      const report = await loadReport(); const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 297, 22, "F"); doc.setTextColor(255); doc.setFontSize(14); doc.text("IMPPEL ERP — Usuários Operacionais", 14, 10); doc.setFontSize(8); doc.text(`Gerado em: ${new Date(report.exportedAt).toLocaleString("pt-BR")}`, 14, 16); doc.setTextColor(0);
      autoTable(doc, { startY: 28, head: [["Login", "Senha Inicial", "Nome Completo", "Cargo", "Perfil", "Status"]], body: report.data.map(row => [row.login, row.senhaInicial || "Senha já alterada", row.nomeCompleto, row.cargo, row.perfil, row.status]), styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [245, 247, 250] } });
      doc.save(`Relatorio_Usuarios_Operacionais_${new Date().toISOString().slice(0, 10)}.pdf`); setMessage("PDF operacional exportado.");
    } catch (err: any) { setError(err.message); }
  };
  const readJsonFile = async (file?: File) => { if (!file) return; try { setText(await file.text()); setPreview([]); setSummary(null); setMessage("JSON carregado. Gere o preview antes de aplicar."); } catch { setError("Não foi possível ler o JSON."); } };

  return <div className="space-y-4">
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Upload className="h-5 w-5" />Importar ou restaurar usuários operacionais</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Cole linhas no formato <strong>Nome completo; DD/MM/AAAA; Cargo opcional</strong> ou carregue o JSON operacional. Nada é aplicado sem preview.</div>
      <textarea value={text} onChange={event => { setText(event.target.value); setPreview([]); }} rows={8} placeholder={"Funcionário Exemplo da Silva; 24/12/1996; Equipe Técnica\nOutro Funcionário; 01/01/2000"} className="w-full rounded-lg border border-slate-200 p-3 font-mono text-sm" data-testid="textarea-operational-users" />
      <div className="flex flex-wrap gap-2"><Button type="button" onClick={buildPreview} disabled={loading}><Users className="mr-2 h-4 w-4" />Gerar preview</Button><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><FileJson className="h-4 w-4" />Carregar JSON operacional<input type="file" accept=".json,application/json" className="hidden" onChange={event => readJsonFile(event.target.files?.[0])} /></label></div>
      {summary && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Total", summary.total], ["Válidos", summary.valid], ["Existentes", summary.existing], ["Erros", summary.errors]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-slate-50 p-3 text-center"><strong className="block text-xl">{value}</strong><span className="text-xs text-slate-500">{label}</span></div>)}</div>}
      {preview.length > 0 && <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-slate-100 text-left"><tr>{["Login", "Senha inicial", "Nome", "Cargo", "Perfil", "Status", "Ação"].map(head => <th key={head} className="p-2">{head}</th>)}</tr></thead><tbody>{preview.map(row => <tr key={row.row} className={row.valid ? "border-t" : "border-t bg-red-50"}><td className="p-2 font-mono">{row.login || "—"}</td><td className="p-2 font-mono">{row.senhaInicial || "—"}</td><td className="p-2">{row.nomeCompleto || row.message}</td><td className="p-2">{row.cargo || "—"}</td><td className="p-2">{row.perfil || "—"}</td><td className="p-2">{row.status || "—"}</td><td className="p-2">{row.action}</td></tr>)}</tbody></table></div>}
      {preview.length > 0 && <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3"><div className="flex items-center gap-2"><Checkbox checked={updateExisting} onCheckedChange={value => setUpdateExisting(value === true)} id="update-existing" /><Label htmlFor="update-existing">Atualizar cargo/perfil/status de usuários existentes</Label></div><div className="flex items-center gap-2"><Checkbox checked={resetPasswords} onCheckedChange={value => setResetPasswords(value === true)} id="reset-passwords" /><Label htmlFor="reset-passwords">Redefinir senha inicial dos existentes e exigir nova troca</Label></div><Button type="button" onClick={applyImport} disabled={loading || preview.some(row => !row.valid)} className="bg-emerald-700 text-white hover:bg-emerald-800"><CheckCircle2 className="mr-2 h-4 w-4" />Confirmar importação</Button></div>}
      {error && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}{message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-lg">Relatório operacional</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-slate-600">PDF e JSON administrativos com login e senha inicial apenas enquanto a troca obrigatória estiver pendente. O backup técnico contém somente bcrypt.</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={exportPdf}><FileText className="mr-2 h-4 w-4" />Exportar PDF</Button><Button type="button" variant="outline" onClick={exportJson}><Download className="mr-2 h-4 w-4" />Exportar JSON</Button></div></CardContent></Card>
  </div>;
}
