import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { asArray } from "@/lib/safeData";
import { getMaterialReturnPolicyLabel } from "@shared/materialReturnPolicy";
import { buildMaterialControlContract } from "@shared/materialControlBackup";
import {
  Download, Upload, FileText, AlertTriangle, CheckCircle2, X,
  ShieldAlert,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ──────────────────────────────────────────────────────────────────
export type BackupType =
  | "usuarios"
  | "estoque"
  | "produtos"
  | "servicos"
  | "materiais"
  | "clientes"
  | "orcamentos"
  | "ordens-servico"
  | "financeiro"
  | "pos-venda"
  | "garantias";

export type RestoreMode = "merge" | "overwrite";

export interface BackupHistoryEntry {
  id: string;
  type: BackupType;
  label: string;
  fileName: string;
  exportedAt: string;
  sizeKB: number;
  backup: any;
}

export interface RestoreLogEntry {
  id: string;
  type: BackupType;
  label: string;
  restoredAt: string;
  mode: RestoreMode;
  updated: number;
  created: number;
  deleted: number;
  backupDate: string;
}

const TYPE_LABELS: Record<BackupType, string> = {
  usuarios: "Usuários e Cargos",
  estoque: "Estoque",
  produtos: "Catálogo de Produtos",
  servicos: "Catálogo de Serviços",
  materiais: "Controle de Materiais",
  clientes: "Clientes",
  orcamentos: "Orçamentos",
  "ordens-servico": "Ordens de Serviço",
  financeiro: "Financeiro",
  "pos-venda": "Garantias/Pós-venda",
  garantias: "Garantias",
};

const FILE_LABELS: Record<BackupType, string> = {
  usuarios: "Usuarios_Cargos",
  estoque: "Estoque",
  produtos: "Catalogo_Produtos",
  servicos: "Catalogo_Servicos",
  materiais: "Controle_Materiais",
  clientes: "Clientes",
  orcamentos: "Orcamentos",
  "ordens-servico": "Ordens_Servico",
  financeiro: "Financeiro",
  "pos-venda": "Garantias_Pos_Venda",
  garantias: "Garantias",
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type MaterialPeriod = "all" | "year" | "month";
type MaterialExportFilters = { period: MaterialPeriod; year: string; month: string };

// Types for which restore should show overwrite warning
const READ_ONLY_RESTORE: BackupType[] = [];

// ─── localStorage helpers ────────────────────────────────────────────────────
const HISTORY_KEY = "imppel_backup_history";
const LOG_KEY = "imppel_restore_log";

export function getBackupHistory(): BackupHistoryEntry[] {
  try { return asArray<BackupHistoryEntry>(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")); } catch { return []; }
}

function saveBackupHistory(entry: BackupHistoryEntry) {
  const history = getBackupHistory();
  history.unshift(entry);
  // Keep last 50 backups
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export function getRestoreLog(): RestoreLogEntry[] {
  try { return asArray<RestoreLogEntry>(JSON.parse(localStorage.getItem(LOG_KEY) || "[]")); } catch { return []; }
}

function saveRestoreLog(entry: RestoreLogEntry) {
  const log = getRestoreLog();
  log.unshift(entry);
  localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 100)));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function fmtDate(d?: string | Date): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export function fmtDateTime(d?: string | Date): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR");
}

function generateFileBaseName(type: BackupType, prefix = "Backup"): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const HH = String(now.getHours()).padStart(2, "0");
  const MM = String(now.getMinutes()).padStart(2, "0");
  return `${prefix}_${FILE_LABELS[type]}_${dd}-${mm}-${yyyy}_${HH}-${MM}`;
}

function getRecordCount(type: BackupType, backup: any): number {
  const d = backup.data || {};
  if (type === "usuarios") return asArray(d.users).length + asArray(d.roles).length;
  if (type === "estoque") return asArray(d.items).length;
  if (type === "produtos") return asArray(d.products).length;
  if (type === "servicos") return asArray(d.services).length;
  if (type === "materiais") return asArray(d.rows).length || (asArray(d.withdrawals).length + asArray(d.entries).length + asArray(d.consumption).length);
  if (type === "clientes") return asArray(d.clients).length;
  if (type === "orcamentos") return asArray(d.jobs).length;
  if (type === "ordens-servico") return asArray(d.workOrders).length;
  if (type === "financeiro") return asArray(d.payments).length + asArray(d.transactions).length;
  if (type === "pos-venda") return asArray(d.warranties).length + asArray(d.npsResponses).length + asArray(d.maintenanceReminders).length;
  if (type === "garantias") return asArray(d.warranties).length;
  return 0;
}

function getOperationalInitialPassword(user: any): string {

  const source = user.senhaInicial || user.initialPassword || user.birthDate || user.birth_date || user.dataNascimento;
  const digits = source ? String(source).replace(/\D/g, "") : "";
  if (digits.length === 8) {
    if (/^\d{4}/.test(String(source)) && Number(digits.slice(4, 6)) <= 12) {
      return `${digits.slice(6, 8)}${digits.slice(4, 6)}${digits.slice(0, 4)}`;
    }
    return digits;
  }
  if (user.mustChangePassword === true) return "Não disponível";
  return user.passwordChanged ? "Data de nascimento pendente" : "Não disponível";
}

function getOperationalBirthDate(user: any): string | null {
  const source = user.birthDate || user.birth_date || user.dataNascimento;
  const digits = source ? String(source).replace(/\D/g, "") : "";
  if (digits.length !== 8) return null;
  if (/^\d{4}/.test(String(source)) && Number(digits.slice(4, 6)) <= 12) {
    return `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function getOperationalFullName(user: any): string {
  return String(user.nomeCompleto || user.fullName || user.name || user.username || user.login || "—");
}

function getOperationalUserRows(users: unknown): string[][] {
  return asArray<any>(users).map((user: any) => [
    user.login || user.username || "—",
    getOperationalInitialPassword(user),
    getOperationalFullName(user),
    user.cargo || user.roleLabel || user.jobTitle || "—",
    user.perfil || user.role || "funcionario",
    user.status || (user.active === false ? "Inativo" : "Ativo"),
  ]);
}

function buildOperationalUsersBackup(backup: any): any {
  const users = asArray<any>(backup.data?.users).map((user: any) => ({
    login: user.login || user.username || "",
    senhaInicial: getOperationalInitialPassword(user),
    birthDate: getOperationalBirthDate(user),
    nomeCompleto: getOperationalFullName(user),
    cargo: user.cargo || user.roleLabel || user.jobTitle || "—",
    perfil: user.perfil || user.role || "funcionario",
    status: user.status || (user.active === false ? "Inativo" : "Ativo"),
    mustChangePassword: user.mustChangePassword === true,
  }));
  return {
    ...backup,
    security: { plaintextPasswordsIncluded: false, passwordHashesIncluded: false },
    data: {
      ...backup.data,
      users,
    },
  };
}

function getPreviewItems(type: BackupType, backup: any): { name: string; detail?: string }[] {
  const d = backup.data || {};
  const toItem = (arr: unknown, nameKey: string, detailFn?: (r: any) => string) =>
    asArray<any>(arr).slice(0, 5).map((r: any) => ({ name: r[nameKey] || "—", detail: detailFn?.(r) }));

  if (type === "usuarios") return toItem(d.users, "username", r => r.roleLabel || r.jobTitle || r.role || "—");
  if (type === "estoque") return toItem(d.items, "name", r => `${r.quantity} ${r.unit || "un"}`);
  if (type === "produtos") return toItem(d.products, "name", r => `R$ ${Number(r.salePrice || 0).toFixed(2)}`);
  if (type === "servicos") return toItem(d.services, "name", r => `R$ ${Number(r.pricePerUnit || 0).toFixed(2)}/m²`);
  if (type === "materiais") return toItem(d.withdrawals, "id", r => `${fmtDate(r.withdrawalDate || r.createdAt)} · ${r.username || "—"}`);
  if (type === "clientes") return toItem(d.clients, "name", r => r.phone || r.email || "—");
  if (type === "orcamentos") return toItem(d.jobs, "clientName", r => r.title || r.status || "—");
  if (type === "ordens-servico") return toItem(d.workOrders, "clientName", r => r.status || "—");
  if (type === "financeiro") return toItem(asArray(d.payments).length ? d.payments : d.transactions, "clientName", r => r.description || `R$ ${Number(r.amount || 0).toFixed(2)}`);
  if (type === "pos-venda") return toItem(d.warranties, "clientName", r => r.serviceType || r.status || "—");
  if (type === "garantias") return toItem(d.warranties, "clientName", r => r.serviceName || r.status || "—");
  return [];
}

// ─── PDF Generation ──────────────────────────────────────────────────────────
export function generatePDF(type: BackupType, backup: any, options: { titlePrefix?: string; generatedBy?: string; filePrefix?: string } = {}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const now = new Date().toLocaleString("pt-BR");
  const label = TYPE_LABELS[type];
  const count = getRecordCount(type, backup);
  const titlePrefix = options.titlePrefix || "Backup";

  // Header bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`IMPPEL ERP — ${titlePrefix} ${label}`, 14, 10);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em: ${now}`, 14, 16);
  if (options.generatedBy) doc.text(`Responsável: ${options.generatedBy}`, 92, 16);
  doc.text(`Total de registros: ${count}`, 230, 16);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Estrutura ERP: módulo=${label}; tipo=${type}; data=${now}; registros=${count}`, 14, 26);

  const headStyle = { fillColor: [15, 23, 42] as [number, number, number], textColor: 255 as unknown as [number, number, number], fontStyle: "bold" as const };
  const altRow = { fillColor: [245, 247, 250] as [number, number, number] };
  const baseStyle = { fontSize: 8, cellPadding: 2 };

  if (type === "usuarios") {
    const users = asArray<any>(backup.data?.users);
    const roles = asArray<any>(backup.data?.roles);
    autoTable(doc, {
      startY: 28,
      head: [["Login", "Senha Inicial", "Nome Completo", "Cargo", "Perfil", "Status"]],
      body: getOperationalUserRows(users),
      styles: baseStyle, headStyles: headStyle, alternateRowStyles: altRow,
    });
    const y = (doc as any).lastAutoTable?.finalY || 28;
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("Cargos e permissões", 14, y + 10);
    autoTable(doc, {
      startY: y + 14,
      head: [["Cargo", "Nome técnico", "Permissões"]],
      body: roles.map((role: any) => [role.label || role.name, role.name, Object.entries(role.permissions || {}).filter(([, allowed]) => allowed).map(([permission]) => permission).join(", ") || "—"]),
      styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fillColor: [71, 85, 105] as [number, number, number], textColor: 255 as unknown as [number, number, number], fontStyle: "bold" }, alternateRowStyles: altRow,
    });
  } else if (type === "estoque") {
    const items = asArray<any>(backup.data?.items);
    const movements = asArray<any>(backup.data?.movements);
    autoTable(doc, {
      startY: 28,
      head: [["Produto", "Categoria", "Politica", "Unidade", "Qtd. Atual", "Min.", "Preco Unit."]],
      body: items.map((i: any) => [i.name, i.type || "-", i.returnPolicy || getMaterialReturnPolicyLabel(i), i.unit || "un", i.quantity, i.minStock, i.pricePerUnit ? `R$ ${Number(i.pricePerUnit).toFixed(2)}` : "-"]),
      styles: baseStyle, headStyles: headStyle, alternateRowStyles: altRow,
    });
    if (movements.length > 0) {
      const y = (doc as any).lastAutoTable?.finalY || 28;
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("Histórico de Movimentações", 14, y + 10);
      autoTable(doc, {
        startY: y + 14,
        head: [["Data", "Produto", "Tipo", "Qtd.", "Obs."]],
        body: movements.map((m: any) => [fmtDate(m.date), m.productName, m.type, m.quantity, m.notes || "—"]),
        styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fillColor: [71, 85, 105] as [number, number, number], textColor: 255 as unknown as [number, number, number], fontStyle: "bold" }, alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
      });
    }
  } else if (type === "produtos") {
    const products = asArray<any>(backup.data?.products);
    autoTable(doc, {
      startY: 28,
      head: [["Produto", "Categoria", "Marca", "Unid.", "Preço Venda", "Desc. Máx.", "Ativo"]],
      body: products.map((p: any) => [p.name, p.category || "—", p.brand || "—", p.unit || "un", `R$ ${Number(p.salePrice || 0).toFixed(2)}`, `${p.maxDiscount || 0}%`, p.active ? "Sim" : "Não"]),
      styles: baseStyle, headStyles: headStyle, alternateRowStyles: altRow,
    });
  } else if (type === "servicos") {
    const services = asArray<any>(backup.data?.services);
    autoTable(doc, {
      startY: 28,
      head: [["Serviço", "Descrição", "R$/m²", "Mão de Obra/m²", "Transporte/m²"]],
      body: services.map((s: any) => [s.name, s.description || "—", `R$ ${Number(s.pricePerUnit || 0).toFixed(2)}`, `R$ ${Number(s.laborCostPerM2 || 0).toFixed(2)}`, `R$ ${Number(s.transportCostPerM2 || 0).toFixed(2)}`]),
      styles: baseStyle, headStyles: headStyle, alternateRowStyles: altRow,
    });
  } else if (type === "materiais") {
    const materialContract = buildMaterialControlContract({
      withdrawals: backup.data?.withdrawals,
      entries: backup.data?.entries,
      consumption: backup.data?.consumption,
      period: backup.filters?.period,
      year: backup.filters?.year,
      month: backup.filters?.month,
      exportedAt: backup.exportedAt,
    });
    const rows = asArray<any>(materialContract.data?.rows);
    const days = asArray<any>(materialContract.data?.days);
    const periodLabel = backup.filters?.label ? `Período: ${backup.filters.label}` : "Período: Todos os meses";
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(periodLabel, 14, 32);
    if (!rows.length) {
      doc.setFontSize(12);
      doc.text("Nenhum registro encontrado para este período.", 14, 44);
    } else if (days.length) {
      let y = 40;
      for (const day of days) {
        if (y > 174) { doc.addPage(); y = 28; }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(fmtDate(day.date), 14, y);
        y += 4;
        const rows: string[][] = [];
        for (const row of asArray<any>(day.rows)) {
          rows.push([
            row.responsible || "—",
            row.itemsText || "—",
            row.type || "—",
            row.notes || "—",
            row.status || "—",
          ]);
        }
        autoTable(doc, {
          startY: y,
          head: [["Responsável", "Itens", "Tipo", "Origem/Observação", "Status"]],
          body: rows,
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: headStyle,
          alternateRowStyles: altRow,
          columnStyles: { 0: { cellWidth: 34 }, 1: { cellWidth: 88 }, 2: { cellWidth: 30 }, 3: { cellWidth: 72 }, 4: { cellWidth: 28 } },
        });
        y = ((doc as any).lastAutoTable?.finalY || y) + 8;
      }
    } else {
      autoTable(doc, {
        startY: 38,
        head: [["Data", "Responsável", "Itens", "Tipo", "Origem/Observação", "Status"]],
        body: rows.map((row: any) => [fmtDate(row.date), row.responsible || "—", row.itemsText || "—", row.type || "—", row.notes || "—", row.status || "—"]),
        styles: { fontSize: 7, cellPadding: 2 }, headStyles: headStyle, alternateRowStyles: altRow,
      });
    }
  } else if (type === "clientes") {
    const clients = asArray<any>(backup.data?.clients);
    autoTable(doc, {
      startY: 28,
      head: [["Nome", "Telefone", "Email", "Cidade", "CPF/CNPJ"]],
      body: clients.map((c: any) => [c.name, c.phone || "—", c.email || "—", c.city || "—", c.cpfCnpj || "—"]),
      styles: baseStyle, headStyles: headStyle, alternateRowStyles: altRow,
    });
  } else if (type === "orcamentos") {
    const jobs = asArray<any>(backup.data?.jobs);
    autoTable(doc, {
      startY: 28,
      head: [["Cliente", "Título", "Status", "Valor Total", "Data"]],
      body: jobs.map((j: any) => [j.clientName, j.title || "—", j.status, j.totalPrice ? `R$ ${Number(j.totalPrice).toFixed(2)}` : "—", fmtDate(j.createdAt)]),
      styles: baseStyle, headStyles: headStyle, alternateRowStyles: altRow,
    });
  } else if (type === "ordens-servico") {
    const workOrders = asArray<any>(backup.data?.workOrders);
    autoTable(doc, {
      startY: 28,
      head: [["#", "Cliente", "Serviço", "Técnico", "Status", "Data Prevista"]],
      body: workOrders.map((w: any) => [w.id, w.clientName, w.serviceName || "—", w.technicianName || "—", w.status, fmtDate(w.scheduledDate)]),
      styles: baseStyle, headStyles: headStyle, alternateRowStyles: altRow,
    });
  } else if (type === "garantias") {
    const warranties = asArray<any>(backup.data?.warranties);
    autoTable(doc, {
      startY: 28,
      head: [["Cliente", "Serviço", "Telefone", "Emissão", "Vencimento", "Status"]],
      body: warranties.map((w: any) => [w.clientName, w.serviceType || w.serviceName || "—", w.clientPhone || "—", fmtDate(w.startDate || w.issueDate), fmtDate(w.endDate || w.expiryDate), w.status]),
      styles: baseStyle, headStyles: headStyle, alternateRowStyles: altRow,
    });
  } else if (type === "financeiro") {
    const payments = asArray<any>(backup.data?.payments);
    const transactions = asArray<any>(backup.data?.transactions);
    autoTable(doc, {
      startY: 28,
      head: [["Tipo", "Cliente/Categoria", "Descrição", "Valor", "Status", "Data"]],
      body: [
        ...payments.map((p: any) => ["Pagamento", p.clientName || "—", p.paymentMethod || "—", `R$ ${Number(p.amount || 0).toFixed(2)}`, p.status || "—", fmtDate(p.date)]),
        ...transactions.map((t: any) => [t.type || "Movimento", t.category || "—", t.description || "—", `R$ ${Number(t.amount || 0).toFixed(2)}`, "—", fmtDate(t.date)]),
      ],
      styles: baseStyle, headStyles: headStyle, alternateRowStyles: altRow,
    });
  } else if (type === "pos-venda") {
    const warranties = asArray<any>(backup.data?.warranties);
    const npsResponses = asArray<any>(backup.data?.npsResponses);
    const maintenanceReminders = asArray<any>(backup.data?.maintenanceReminders);
    autoTable(doc, {
      startY: 28,
      head: [["Módulo", "Cliente", "Serviço", "Status", "Data/Período", "Observação"]],
      body: [
        ...warranties.map((w: any) => ["Garantia", w.clientName, w.serviceType || w.serviceName || "—", w.status || "—", `${fmtDate(w.startDate || w.issueDate)} a ${fmtDate(w.endDate || w.expiryDate)}`, w.notes || "—"]),
        ...npsResponses.map((n: any) => ["NPS", n.clientName, "Pós-venda", n.status || "—", fmtDate(n.sentAt || n.createdAt), n.score ? `Nota ${n.score}` : n.comment || "—"]),
        ...maintenanceReminders.map((m: any) => ["Manutenção", m.clientName, m.serviceType || "—", "Lembrete", fmtDate(m.completedDate || m.createdAt), m.notes || "—"]),
      ],
      styles: baseStyle, headStyles: headStyle, alternateRowStyles: altRow,
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`IMPPEL ERP — ${titlePrefix} ${label} — Página ${i} de ${pageCount}`, 14, 205);
    doc.text("Documento confidencial", 250, 205);
  }

  doc.save(`${generateFileBaseName(type, options.filePrefix || titlePrefix)}.pdf`);
}

// ─── Restore Modal ────────────────────────────────────────────────────────────
function RestoreModal({
  backup, type, onConfirm, onCancel, isLoading,
}: {
  backup: any; type: BackupType; onConfirm: (mode: RestoreMode) => void;
  onCancel: () => void; isLoading: boolean;
}) {
  const [mode, setMode] = useState<RestoreMode>("merge");
  const d = backup.data || {};
  const items = getPreviewItems(type, backup);
  const totalCount = getRecordCount(type, backup);
  const isReadOnly = READ_ONLY_RESTORE.includes(type);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Confirmar Restauração</h2>
            <p className="text-sm text-gray-500">{TYPE_LABELS[type]} — {totalCount} registro(s)</p>
          </div>
          <button onClick={onCancel} className="ml-auto p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Backup metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">registros no backup</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-slate-900">{backup.exportedAt ? fmtDateTime(backup.exportedAt) : "—"}</p>
              <p className="text-xs text-slate-500 mt-0.5">data do backup</p>
            </div>
          </div>

          {/* Mode selector */}
          {!isReadOnly && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">Modo de Restauração</div>
              <div className="p-3 space-y-2">
                <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-colors ${mode === "merge" ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-gray-200"}`}>
                  <input type="radio" name="restore-mode" value="merge" checked={mode === "merge"} onChange={() => setMode("merge")} className="mt-0.5 accent-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Merge (Mesclar)</p>
                    <p className="text-xs text-gray-500 mt-0.5">Atualiza registros existentes e cria novos. Nenhum dado atual é excluído.</p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-colors ${mode === "overwrite" ? "border-red-500 bg-red-50" : "border-gray-100 hover:border-gray-200"}`}>
                  <input type="radio" name="restore-mode" value="overwrite" checked={mode === "overwrite"} onChange={() => setMode("overwrite")} className="mt-0.5 accent-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Sobrescrita Total (Substituir tudo)</p>
                    <p className="text-xs text-gray-500 mt-0.5">Remove TODOS os registros atuais e substitui pelos do backup. Irreversível.</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Warning */}
          {mode === "overwrite" ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800 flex gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-semibold mb-0.5">⚠️ Atenção — Operação Destrutiva</p>
                <p>TODOS os registros atuais de <strong>{TYPE_LABELS[type]}</strong> serão excluídos permanentemente antes de restaurar. Esta ação é <strong>irreversível</strong>.</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              <p className="font-semibold mb-1">ℹ️ Modo Merge</p>
              <p>Registros existentes serão atualizados. Novos registros serão criados. Nenhum dado atual será excluído.</p>
            </div>
          )}

          {/* Preview */}
          {items.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                Pré-visualização — primeiros {Math.min(items.length, 5)} de {totalCount}
              </div>
              <div className="divide-y divide-gray-100 max-h-36 overflow-y-auto">
                {items.map((item, i) => (
                  <div key={i} className="px-3 py-2 flex justify-between text-xs">
                    <span className="text-gray-700 font-medium truncate">{item.name}</span>
                    {item.detail && <span className="text-gray-500 shrink-0 ml-2">{item.detail}</span>}
                  </div>
                ))}
                {totalCount > 5 && (
                  <div className="px-3 py-2 text-xs text-gray-400 text-center">+{totalCount - 5} registros adicionais</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(mode)}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${mode === "overwrite" ? "bg-red-600 hover:bg-red-700" : "bg-blue-900 hover:bg-blue-800"}`}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {mode === "overwrite" ? "Confirmar Sobrescrita" : "Confirmar Restauração"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface BackupManagerProps {
  type: BackupType;
  label?: string;
  onRestored?: () => void;
  adminOnly?: boolean;
  isAdmin?: boolean;
  showBackup?: boolean;
  showRestore?: boolean;
  backupButtonLabel?: string;
  purpose?: "backup" | "export";
  generatedBy?: string;
  materialFilters?: MaterialExportFilters;
}

const INVALIDATE_KEYS: Record<BackupType, string[]> = {
  usuarios: ["/api/users", "/api/roles"],
  estoque: ["/api/inventory", "/api/inventory-movements"],
  produtos: ["/api/products"],
  servicos: ["/api/services"],
  materiais: ["/api/material-withdrawals"],
  clientes: ["/api/clients"],
  orcamentos: ["/api/jobs"],
  "ordens-servico": ["/api/work-orders"],
  financeiro: ["/api/payments", "/api/transactions", "/api/jobs"],
  "pos-venda": ["/api/warranties", "/api/nps-responses", "/api/maintenance-reminders"],
  garantias: ["/api/warranties"],
};

export default function BackupManager({
  type, label, onRestored, adminOnly = true, isAdmin = true, showBackup = true, showRestore = true, backupButtonLabel = "Gerar backup", purpose = "backup", generatedBy, materialFilters,
}: BackupManagerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<any>(null);
  const effectiveLabel = label || TYPE_LABELS[type];

  const restoreMutation = useMutation({
    mutationFn: ({ backup, mode }: { backup: any; mode: RestoreMode }) =>
      apiRequest("POST", `/api/backup/restore/${type}?mode=${mode}`, backup).then(res => res.json()),
    onSuccess: (res: any, { backup, mode }) => {
      INVALIDATE_KEYS[type].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
      // Save restore log
      const logEntry: RestoreLogEntry = {
        id: Date.now().toString(36),
        type,
        label: effectiveLabel,
        restoredAt: new Date().toISOString(),
        mode,
        updated: res.updated || 0,
        created: res.created || 0,
        deleted: res.deleted || 0,
        backupDate: backup.exportedAt || "—",
      };
      saveRestoreLog(logEntry);
      setPendingRestore(null);

      const parts: string[] = [];
      if ((res.updated || 0) > 0) parts.push(`${res.updated} atualizado(s)`);
      if ((res.created || 0) > 0) parts.push(`${res.created} criado(s)`);
      if ((res.deleted || 0) > 0) parts.push(`${res.deleted} excluído(s)`);
      if ((res.movementsRestored || 0) > 0) parts.push(`${res.movementsRestored} movimentação(ões) recuperada(s)`);

      toast({
        title: "Restauração concluída!",
        description: parts.join(" · ") || res.message || "Dados restaurados.",
      });
      onRestored?.();
    },
    onError: (err: any) => {
      toast({ title: "Erro na restauração", description: err.message, variant: "destructive" });
    },
  });

  const handleGenerateBackup = async () => {
    setLoadingBackup(true);
    try {
      const params = type === "materiais" && materialFilters
        ? `?period=${encodeURIComponent(materialFilters.period)}&year=${encodeURIComponent(materialFilters.year)}&month=${encodeURIComponent(materialFilters.month)}`
        : "";
      const backupRes = await apiRequest("GET", `/api/backup/${type}${params}`);
      const backup = await backupRes.json();
      const downloadableBackup = type === "usuarios" ? buildOperationalUsersBackup(backup) : backup;
      const isExport = purpose === "export";
      const baseName = generateFileBaseName(type, isExport ? "Relatorio" : "Backup");
      const jsonStr = JSON.stringify(downloadableBackup, null, 2);
      const sizeKB = Math.round(jsonStr.length / 1024 * 10) / 10;

      generatePDF(type, downloadableBackup, {
        titlePrefix: isExport ? "Relatório" : "Backup",
        filePrefix: isExport ? "Relatorio" : "Backup",
        generatedBy,
      });

      if (!isExport || type === "usuarios") {
        const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${baseName}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      }

      if (!isExport) {
        const entry: BackupHistoryEntry = {
          id: Date.now().toString(36),
          type,
          label: effectiveLabel,
          fileName: baseName,
          exportedAt: new Date().toISOString(),
          sizeKB,
          backup: downloadableBackup,
        };
        saveBackupHistory(entry);
      }

      toast({
        title: isExport ? "Relatório exportado com sucesso!" : "Backup gerado com sucesso!",
        description: isExport && type !== "usuarios"
          ? `${baseName}.pdf baixado para conferência segura.`
          : `${baseName}.json restaurável e PDF de conferência baixados.`,
      });
    } catch (err: any) {
      toast({ title: "Erro ao gerar backup", description: err.message, variant: "destructive" });
    } finally {
      setLoadingBackup(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".json")) {
      toast({
        title: "Arquivo não suportado",
        description: "Restauração modular aceita somente JSON técnico gerado pelo ERP. PDF, CSV e texto são apenas conferência ou não são suportados.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = String(evt.target?.result || "").trim();
        const jsonStart = content.indexOf("{");
        const jsonEnd = content.lastIndexOf("}");
        const jsonContent = jsonStart >= 0 && jsonEnd > jsonStart ? content.slice(jsonStart, jsonEnd + 1) : content;
        const parsed = JSON.parse(jsonContent);
        if (!parsed.type || !parsed.data) {
          toast({ title: "Arquivo inválido", description: "O arquivo não é um backup válido do IMPPEL ERP.", variant: "destructive" });
          return;
        }
        if (parsed.type !== type) {
          toast({ title: "Tipo de backup incorreto", description: `Este backup é do tipo "${parsed.type}", mas você está em "${type}".`, variant: "destructive" });
          return;
        }
        setPendingRestore(parsed);
      } catch {
        toast({ title: "Erro ao ler arquivo", description: "Não foi possível interpretar o arquivo com segurança. Use a restauração por texto com preview.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (adminOnly && !isAdmin) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        {showBackup && (
          <button
            onClick={handleGenerateBackup}
            disabled={loadingBackup}
            data-testid={`button-backup-${type}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
            title={`Gerar Backup — ${effectiveLabel}`}
          >
            {loadingBackup ? (
              <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-red-500" />
            )}
            <span className="hidden sm:inline">{backupButtonLabel}</span>
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        {showRestore && (
          <button
            onClick={() => fileInputRef.current?.click()}
            data-testid={`button-restore-${type}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all shadow-sm"
            title="Importar Backup Anterior"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileSelect}
          data-testid={`input-file-restore-${type}`}
        />
      </div>

      {pendingRestore && (
        <RestoreModal
          backup={pendingRestore}
          type={type}
          onConfirm={(mode) => restoreMutation.mutate({ backup: pendingRestore, mode })}
          onCancel={() => setPendingRestore(null)}
          isLoading={restoreMutation.isPending}
        />
      )}
    </>
  );
}
