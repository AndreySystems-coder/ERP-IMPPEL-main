import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, DollarSign, FileText } from "lucide-react";
import { Card } from "@/components/Card";

type Job = {
  id: number;
  clientName: string;
  serviceType: string;
  status: string;
  realPriceSold?: number;
  calculatedPrice?: number;
  materialCost?: number;
  laborCost?: number;
  profit?: number;
  margin?: number;
  createdAt: string;
};

type Transaction = {
  id: number;
  type: string;
  category: string;
  amount: number;
  description: string;
  date: string;
};

type WorkOrder = {
  id: number;
  clientName: string;
  serviceType: string;
  status: string;
  scheduledDate?: string;
  createdAt: string;
};

const fmtBRL  = (v?: number | null) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function getMonth(dateStr: string) {
  return new Date(dateStr).getMonth();
}
function getYear(dateStr: string) {
  return new Date(dateStr).getFullYear();
}

export default function Reports() {
  const [tab, setTab] = useState<"geral" | "dre" | "obras" | "conversao">("geral");
  const [selMonth, setSelMonth] = useState(new Date().getMonth());
  const [selYear, setSelYear]   = useState(new Date().getFullYear());
  const [period, setPeriod]     = useState({ start: "", end: "" });
  const [statusFilter, setStatusFilter] = useState("todos");

  const { data: jobs = []         } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });
  const { data: transactions = [] } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });
  const { data: workOrders = []   } = useQuery<WorkOrder[]>({ queryKey: ["/api/work-orders"] });

  // ─── DRE Mensal ──────────────────────────────────────────────────────────────
  const monthJobs = (jobs as Job[]).filter(j => {
    const d = new Date(j.createdAt);
    return d.getMonth() === selMonth && d.getFullYear() === selYear;
  });
  const monthTx = (transactions as Transaction[]).filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === selMonth && d.getFullYear() === selYear;
  });

  const receita      = monthJobs.reduce((s, j) => s + (j.realPriceSold || 0), 0);
  const custoMat     = monthJobs.reduce((s, j) => s + (j.materialCost || 0), 0);
  const custoMO      = monthJobs.reduce((s, j) => s + (j.laborCost || 0), 0);
  const txInflow     = monthTx.filter(t => t.type === "inflow").reduce((s, t) => s + t.amount, 0);
  const txOutflow    = monthTx.filter(t => t.type === "outflow").reduce((s, t) => s + t.amount, 0);
  const lucroEstim   = receita - custoMat - custoMO;
  const margemEstim  = receita > 0 ? (lucroEstim / receita) * 100 : 0;

  // ─── Obras por período ────────────────────────────────────────────────────────
  const filteredWOs = (workOrders as WorkOrder[]).filter(wo => {
    if (statusFilter !== "todos" && wo.status !== statusFilter) return false;
    if (period.start) {
      const d = new Date(wo.createdAt);
      if (d < new Date(period.start)) return false;
    }
    if (period.end) {
      const d = new Date(wo.createdAt);
      if (d > new Date(period.end + "T23:59:59")) return false;
    }
    return true;
  });

  const woByStatus: Record<string, number> = {};
  (workOrders as WorkOrder[]).forEach(wo => { woByStatus[wo.status] = (woByStatus[wo.status] || 0) + 1; });

  // ─── Conversão ────────────────────────────────────────────────────────────────
  const total     = (jobs as Job[]).length;
  const aprovados = (jobs as Job[]).filter(j => !["Lead","Perdido","Cancelado"].includes(j.status)).length;
  const perdidos  = (jobs as Job[]).filter(j => ["Perdido","Cancelado"].includes(j.status)).length;
  const taxa      = total > 0 ? ((aprovados / total) * 100).toFixed(1) : "0";

  // ─── Geral KPIs ──────────────────────────────────────────────────────────────
  const totalReceita = (jobs as Job[]).reduce((s, j) => s + (j.realPriceSold || 0), 0);
  const totalLucro   = (jobs as Job[]).reduce((s, j) => s + (j.profit || 0), 0);
  const avgMargin    = (jobs as Job[]).length > 0
    ? (jobs as Job[]).reduce((s, j) => s + (j.margin || 0), 0) / (jobs as Job[]).length
    : 0;
  const osAtivas = (workOrders as WorkOrder[]).filter(wo => !["Concluída","Cancelada"].includes(wo.status)).length;

  // By service type
  const byService: Record<string, { count: number; revenue: number; profit: number }> = {};
  (jobs as Job[]).forEach(j => {
    if (!byService[j.serviceType]) byService[j.serviceType] = { count: 0, revenue: 0, profit: 0 };
    byService[j.serviceType].count++;
    byService[j.serviceType].revenue += j.realPriceSold || 0;
    byService[j.serviceType].profit  += j.profit || 0;
  });
  const serviceList = Object.entries(byService).sort((a, b) => b[1].revenue - a[1].revenue);

  const tabs = [
    { id: "geral",     label: "Visão Geral" },
    { id: "dre",       label: "DRE Mensal" },
    { id: "obras",     label: "Obras por Período" },
    { id: "conversao", label: "Taxa de Conversão" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          Relatórios Gerenciais
        </h1>
        <p className="text-slate-500 mt-1">DRE mensal, obras por período, taxa de conversão e métricas de desempenho.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── VISÃO GERAL ─────────────────────────────────────────────────── */}
      {tab === "geral" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Receita Total", value: fmtBRL(totalReceita), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
              { label: "Lucro Total",   value: fmtBRL(totalLucro),   icon: TrendingUp, color: "text-primary",   bg: "bg-blue-50" },
              { label: "Margem Média",  value: `${(avgMargin * 100).toFixed(1)}%`, icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "OS em Aberto",  value: String(osAtivas), icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
            ].map(k => (
              <Card key={k.label} className={`${k.bg} border-0 p-5`}>
                <div className="flex items-start gap-3">
                  <k.icon className={`w-6 h-6 ${k.color} mt-0.5`} />
                  <div>
                    <p className="text-xl font-bold text-slate-900">{k.value}</p>
                    <p className={`text-sm font-medium ${k.color}`}>{k.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Receita por Tipo de Serviço</h3>
            </div>
            {serviceList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">Nenhum dado disponível.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {serviceList.map(([service, data]) => (
                  <div key={service} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{service}</p>
                      <p className="text-xs text-slate-400">{data.count} orçamento(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{fmtBRL(data.revenue)}</p>
                      <p className="text-xs text-green-600">{fmtBRL(data.profit)} de lucro</p>
                    </div>
                    {/* Simple progress bar */}
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-2 bg-primary rounded-full" style={{ width: `${Math.min((data.revenue / totalReceita) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Last 10 jobs */}
          <Card>
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Últimos Orçamentos</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {(jobs as Job[]).slice(0, 10).map(j => (
                <div key={j.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{j.clientName}</p>
                    <p className="text-xs text-slate-400">{j.serviceType} · {fmtDate(j.createdAt)}</p>
                  </div>
                  <p className="font-semibold text-slate-900">{fmtBRL(j.realPriceSold)}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    j.status === "Concluído" ? "bg-green-100 text-green-700" :
                    j.status === "Perdido"   ? "bg-red-100 text-red-700" :
                    "bg-blue-100 text-blue-700"}`}>{j.status}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── DRE MENSAL ──────────────────────────────────────────────────── */}
      {tab === "dre" && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Mês</label>
                <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
                  className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                  {MONTHS_PT.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Ano</label>
                <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
                  className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                  {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">DRE — {MONTHS_PT[selMonth]} {selYear}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{monthJobs.length} orçamento(s) no período</p>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: "Receita Bruta (vendas)",      value: receita,        color: "text-green-600", bold: true },
                  { label: "(−) Custo de Materiais",      value: -custoMat,      color: "text-red-500" },
                  { label: "(−) Custo de Mão de Obra",    value: -custoMO,       color: "text-red-500" },
                  { label: "Lucro Estimado",               value: lucroEstim,     color: lucroEstim >= 0 ? "text-green-700" : "text-red-600", bold: true },
                ].map(row => (
                  <div key={row.label} className={`flex justify-between py-2 ${row.bold ? "border-t border-slate-200 pt-3" : ""}`}>
                    <span className={`text-sm ${row.bold ? "font-bold text-slate-800" : "text-slate-600"}`}>{row.label}</span>
                    <span className={`font-bold ${row.color}`}>{fmtBRL(Math.abs(row.value))}{row.value < 0 ? "" : ""}</span>
                  </div>
                ))}
                <div className="bg-slate-50 rounded-xl p-3 mt-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-slate-700">Margem Líquida Estimada</span>
                    <span className={`font-bold ${margemEstim >= 30 ? "text-green-600" : "text-red-600"}`}>{margemEstim.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Movimentações Financeiras</h3>
                <p className="text-xs text-slate-400 mt-0.5">{monthTx.length} transação(ões)</p>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between py-2">
                  <span className="text-sm text-slate-600 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" /> Entradas</span>
                  <span className="font-bold text-green-600">{fmtBRL(txInflow)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-slate-600 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" /> Saídas</span>
                  <span className="font-bold text-red-600">{fmtBRL(txOutflow)}</span>
                </div>
                <div className="flex justify-between py-3 border-t border-slate-200">
                  <span className="font-bold text-slate-800">Saldo do Período</span>
                  <span className={`font-bold text-lg ${txInflow - txOutflow >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtBRL(txInflow - txOutflow)}</span>
                </div>
              </div>
              {monthTx.length > 0 && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {monthTx.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-700">{t.description}</p>
                        <p className="text-xs text-slate-400">{t.category}</p>
                      </div>
                      <span className={`text-sm font-bold ${t.type === "inflow" ? "text-green-600" : "text-red-600"}`}>
                        {t.type === "inflow" ? "+" : "−"}{fmtBRL(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── OBRAS POR PERÍODO ───────────────────────────────────────────── */}
      {tab === "obras" && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">De</label>
                <input type="date" value={period.start} onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))}
                  className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Até</label>
                <input type="date" value={period.end} onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))}
                  className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                  <option value="todos">Todos</option>
                  {["Planejada","Em Execução","Concluída","Cancelada"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(woByStatus).map(([status, count]) => (
              <Card key={status} className="p-4 text-center border-0 bg-slate-50">
                <p className="text-2xl font-bold text-slate-900">{count}</p>
                <p className="text-sm text-slate-500 font-medium">{status}</p>
              </Card>
            ))}
          </div>

          <Card>
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Ordens de Serviço ({filteredWOs.length})</h3>
            </div>
            {filteredWOs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">Nenhuma OS no período selecionado.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredWOs.map(wo => (
                  <div key={wo.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{wo.clientName}</p>
                      <p className="text-xs text-slate-400">{wo.serviceType} · {fmtDate(wo.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      wo.status === "Concluída"    ? "bg-green-100 text-green-700" :
                      wo.status === "Em Execução"  ? "bg-blue-100 text-blue-700" :
                      wo.status === "Cancelada"    ? "bg-red-100 text-red-700" :
                      "bg-slate-100 text-slate-600"}`}>{wo.status}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── CONVERSÃO ───────────────────────────────────────────────────── */}
      {tab === "conversao" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: "Total de Orçamentos", value: total, icon: FileText, bg: "bg-slate-50", color: "text-slate-700" },
              { label: "Convertidos (Aprovados)", value: aprovados, icon: CheckCircle, bg: "bg-green-50", color: "text-green-700" },
              { label: "Perdidos / Cancelados",   value: perdidos,  icon: AlertTriangle, bg: "bg-red-50", color: "text-red-700" },
            ].map(k => (
              <Card key={k.label} className={`${k.bg} border-0 p-6`}>
                <k.icon className={`w-8 h-8 ${k.color} mb-3`} />
                <p className="text-4xl font-bold text-slate-900">{k.value}</p>
                <p className={`text-sm font-semibold ${k.color} mt-1`}>{k.label}</p>
              </Card>
            ))}
          </div>

          <Card className="p-6">
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Taxa de Conversão</p>
              <p className="text-7xl font-black text-primary">{taxa}%</p>
              <p className="text-slate-500 mt-2">{aprovados} de {total} orçamentos foram aprovados</p>
              <div className="w-full bg-slate-100 rounded-full h-3 mt-6">
                <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${taxa}%` }} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Distribuição por Status</h3>
            </div>
            <div className="p-5 space-y-3">
              {(Object.entries((jobs as Job[]).reduce((acc, j) => {
                acc[j.status] = (acc[j.status] || 0) + 1; return acc;
              }, {} as Record<string, number>)).sort((a,b) => b[1]-a[1])).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-600 w-36 truncate">{status}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-sm font-bold text-slate-800 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
