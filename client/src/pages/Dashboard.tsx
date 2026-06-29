import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  DollarSign, TrendingUp, Activity, Briefcase, Users, Target,
  Package, AlertTriangle, Plus, ClipboardList, Warehouse, CheckSquare,
  ArrowRight, Calendar, ChevronRight, BarChart2, FileText, Clock, ShoppingCart, PackageCheck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { asArray } from "@/lib/safeData";
import { isMaterialWithdrawalPending } from "@shared/materialReturnPolicy";

const apiGet = async (path: string) => {
  const response = await fetch(path, { credentials: "include" });
  if (!response.ok) {
    const detail = await response.text();
    console.warn(`Dashboard API indisponível (${response.status}) em ${path}: ${detail || response.statusText}`);
    return null;
  }
  return response.json();
};

function formatBRL(n: number | undefined | null) {
  if (!n) return "R$ 0";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseJsonArray(value: unknown) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function statusIncludes(value: unknown, terms: string[]) {
  const normalized = String(value || "").toLowerCase();
  return terms.some(term => normalized.includes(term.toLowerCase()));
}

function MiniList({ title, rows, empty }: { title: string; rows: { name: string; detail: string }[]; empty: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">{empty}</p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {rows.map((row, index) => (
            <div key={`${row.name}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate text-xs font-bold text-slate-700">{row.name}</span>
              <span className="shrink-0 text-[11px] text-slate-500">{row.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: metrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: () => apiGet("/api/dashboard/metrics"),
  });
  const { data: jobs = [] } = useQuery({ queryKey: ["/api/jobs"], queryFn: () => apiGet("/api/jobs") });
  const { data: workOrders = [] } = useQuery({ queryKey: ["/api/work-orders"], queryFn: () => apiGet("/api/work-orders") });
  const { data: inventory = [] } = useQuery({ queryKey: ["/api/inventory"], queryFn: () => apiGet("/api/inventory") });
  const { data: leads = [] } = useQuery({ queryKey: ["/api/leads"], queryFn: () => apiGet("/api/leads") });
  const { data: inventoryMovements = [] } = useQuery({ queryKey: ["/api/inventory-movements"], queryFn: () => apiGet("/api/inventory-movements") });
  const { data: materialWithdrawals = [] } = useQuery({ queryKey: ["/api/material-withdrawals"], queryFn: () => apiGet("/api/material-withdrawals") });
  const { data: productionLogs = [] } = useQuery({ queryKey: ["/api/production-logs"], queryFn: () => apiGet("/api/production-logs") });
  const { data: payments = [] } = useQuery({ queryKey: ["/api/payments"], queryFn: () => apiGet("/api/payments") });
  const { data: materialSales } = useQuery({ queryKey: ["/api/material-sales"], queryFn: () => apiGet("/api/material-sales") });

  const jobsList = asArray<any>(jobs);
  const workOrdersList = asArray<any>(workOrders);
  const inventoryList = asArray<any>(inventory);
  const leadsList = asArray<any>(leads);
  const movementList = asArray<any>(inventoryMovements);
  const withdrawalList = asArray<any>(materialWithdrawals);
  const productionList = asArray<any>(productionLogs);
  const paymentsList = asArray<any>(payments);
  const salesList = asArray<any>((materialSales as any)?.sales);

  const pendingJobs = jobsList.filter((j: any) => ["Lead", "Proposta", "Negociação"].includes(j.status)).length;
  const activeOrders = workOrdersList.filter((w: any) => ["Em Andamento", "Agendada"].includes(w.status)).length;
  const lowStock = inventoryList.filter((i: any) => i.quantity <= i.minStock).length;
  const newLeads = leadsList.filter((l: any) => ["New Lead", "Contacted"].includes(l.status)).length;
  const runningWorks = workOrdersList.filter((w: any) => statusIncludes(w.status, ["andamento", "execução"]));
  const finishedWorks = workOrdersList.filter((w: any) => statusIncludes(w.status, ["concluída", "finalizada"]));
  const scheduledWorks = workOrdersList.filter((w: any) => statusIncludes(w.status, ["agendada", "planejada"]));
  const openWithdrawals = withdrawalList.filter((w: any) => isMaterialWithdrawalPending(w));
  const pendingReturns = openWithdrawals.filter((w: any) => Number(w.returnedQuantity || 0) < Number(w.quantity || w.withdrawn || 0));
  const receivedPayments = paymentsList.filter((p: any) => statusIncludes(p.status, ["paid", "pago", "recebido"]));
  const pendingPayments = paymentsList.filter((p: any) => statusIncludes(p.status, ["pending", "pendente", "aberto"]));
  const approvedSales = salesList.filter((sale: any) => statusIncludes(sale.status, ["aprovada", "aprovado"]));
  const recentJobs = [...jobsList].sort((a, b) => b.id - a.id).slice(0, 5);
  const recentOrders = [...workOrdersList].sort((a, b) => b.id - a.id).slice(0, 4);
  const weekday = format(new Date(), "EEEE", { locale: ptBR });
  const formattedDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const movementChart = React.useMemo(() => {
    const grouped = new Map<string, { name: string; entradas: number; saidas: number }>();
    movementList.slice(-60).forEach((movement: any) => {
      const date = movement.date || movement.createdAt;
      const key = date ? format(new Date(date), "dd/MM") : "Sem data";
      const row = grouped.get(key) || { name: key, entradas: 0, saidas: 0 };
      const quantity = Math.abs(Number(movement.quantity || 0));
      if (statusIncludes(movement.type, ["entrada"])) row.entradas += quantity;
      else row.saidas += quantity;
      grouped.set(key, row);
    });
    return Array.from(grouped.values()).slice(-10);
  }, [movementList]);

  const mostUsedProducts = React.useMemo(() => {
    const totals = new Map<string, number>();
    movementList.forEach((movement: any) => {
      if (!statusIncludes(movement.type, ["saida", "saída", "ajuste negativo"])) return;
      const name = movement.productName || movement.inventoryName || movement.name || `Item #${movement.inventoryId || movement.id}`;
      totals.set(name, (totals.get(name) || 0) + Math.abs(Number(movement.quantity || 0)));
    });
    withdrawalList.forEach((withdrawal: any) => {
      parseJsonArray(withdrawal.items).forEach((item: any) => {
        const name = item.name || item.productName || item.materialName || "Material";
        totals.set(name, (totals.get(name) || 0) + Math.abs(Number(item.quantity || item.withdrawn || 0)));
      });
    });
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [movementList, withdrawalList]);

  const productivity = React.useMemo(() => {
    const totals = new Map<string, { logs: number; hours: number; area: number }>();
    productionList.forEach((log: any) => {
      const name = log.employeeName || log.username || log.workerName || log.createdBy || "Equipe";
      const current = totals.get(name) || { logs: 0, hours: 0, area: 0 };
      current.logs += 1;
      current.hours += Number(log.hoursWorked || log.hours || 0);
      current.area += Number(log.areaCompleted || log.area || log.squareMeters || 0);
      totals.set(name, current);
    });
    return Array.from(totals.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.logs - a.logs).slice(0, 5);
  }, [productionList]);

  const topSoldProducts = React.useMemo(() => {
    const totals = new Map<string, { quantity: number; total: number }>();
    salesList.forEach((sale: any) => {
      parseJsonArray(sale.items).forEach((item: any) => {
        const name = item.name || "Produto";
        const current = totals.get(name) || { quantity: 0, total: 0 };
        current.quantity += Number(item.quantity || 0);
        current.total += Number(item.total || 0);
        totals.set(name, current);
      });
    });
    return Array.from(totals.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [salesList]);

  const kpis = [
    {
      label: "Faturamento do Mês",
      value: formatBRL(metrics?.monthlyRevenue),
      icon: DollarSign,
      color: "bg-blue-500",
      lightBg: "bg-blue-50",
      textColor: "text-blue-600",
      sub: `Margem média: ${metrics?.averageMargin || 0}%`,
    },
    {
      label: "Orçamentos Pendentes",
      value: pendingJobs,
      icon: Briefcase,
      color: "bg-amber-500",
      lightBg: "bg-amber-50",
      textColor: "text-amber-600",
      sub: `${jobsList.length} orçamentos no total`,
    },
    {
      label: "Obras em Andamento",
      value: activeOrders,
      icon: ClipboardList,
      color: "bg-emerald-500",
      lightBg: "bg-emerald-50",
      textColor: "text-emerald-600",
      sub: `${workOrdersList.length} OSs no total`,
    },
    {
      label: "Alertas de Estoque",
      value: lowStock,
      icon: AlertTriangle,
      color: lowStock > 0 ? "bg-red-500" : "bg-slate-400",
      lightBg: lowStock > 0 ? "bg-red-50" : "bg-slate-50",
      textColor: lowStock > 0 ? "text-red-600" : "text-slate-500",
      sub: lowStock > 0 ? `${lowStock} item(ns) abaixo do mínimo` : "Estoque normalizado",
    },
    {
      label: "Novos Leads",
      value: newLeads,
      icon: Users,
      color: "bg-violet-500",
      lightBg: "bg-violet-50",
      textColor: "text-violet-600",
      sub: `Taxa de conversão: ${metrics?.conversionRate || 0}%`,
    },
    {
      label: "Lucro Estimado",
      value: formatBRL(metrics?.monthlyProfit),
      icon: TrendingUp,
      color: "bg-teal-500",
      lightBg: "bg-teal-50",
      textColor: "text-teal-600",
      sub: "Receita menos custos diretos",
    },
  ];

  const quickActions = [
    {
      label: "Novo Orçamento",
      desc: "Criar proposta para cliente",
      icon: Briefcase,
      href: "/jobs",
      color: "from-blue-600 to-blue-700",
    },
    {
      label: "Nova Ordem de Serviço",
      desc: "Abrir OS para execução",
      icon: ClipboardList,
      href: "/work-orders",
      color: "from-emerald-600 to-emerald-700",
    },
    {
      label: "Registrar Consumo",
      desc: "Lançar materiais na obra",
      icon: CheckSquare,
      href: "/registro-obra",
      color: "from-orange-500 to-orange-600",
    },
    {
      label: "Contagem Física",
      desc: "Atualizar saldo do estoque",
      icon: Warehouse,
      href: "/estoque/contagem-rapida",
      color: "from-violet-600 to-violet-700",
    },
  ];

  const statusColors: Record<string, string> = {
    "Lead": "bg-slate-100 text-slate-600",
    "Proposta": "bg-blue-100 text-blue-700",
    "Negociação": "bg-amber-100 text-amber-700",
    "Aprovado": "bg-emerald-100 text-emerald-700",
    "Reprovado": "bg-red-100 text-red-700",
    "Planejada": "bg-blue-100 text-blue-700",
    "Agendada": "bg-amber-100 text-amber-700",
    "Em Andamento": "bg-orange-100 text-orange-700",
    "Concluída": "bg-emerald-100 text-emerald-700",
    "Cancelada": "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-7">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Painel Principal
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Visão geral da operação IMPPEL.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm sm:text-right">
          <p className="text-sm font-bold capitalize text-primary">{weekday}</p>
          <p className="text-xs text-slate-500">{formattedDate}</p>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={`${kpi.lightBg} rounded-2xl p-4 border border-white shadow-sm`}>
            <div className={`w-9 h-9 rounded-xl ${kpi.color} flex items-center justify-center mb-3 shadow-sm`}>
              <kpi.icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <p className={`text-2xl font-bold ${kpi.textColor}`}>{kpi.value}</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5 leading-tight">{kpi.label}</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-tight">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Ações Rápidas</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <Link key={i} href={action.href}>
              <div className={`bg-gradient-to-br ${action.color} rounded-2xl p-5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md text-white`}
                data-testid={`quick-action-${i}`}>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <p className="font-bold text-sm leading-tight">{action.label}</p>
                <p className="text-white/70 text-xs mt-0.5">{action.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-white/80 text-xs font-semibold">
                  Abrir <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Operational widgets ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Package className="w-4 h-4 text-blue-700" /> Estoque</h3>
            <Link href="/estoque/atual" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">Abrir <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr]">
            <div className="h-56 rounded-xl border border-slate-100 p-3">
              <p className="mb-2 text-xs font-bold uppercase text-slate-400">Movimentações recentes</p>
              {movementChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={movementChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} />
                    <RechartsTooltip />
                    <Bar dataKey="entradas" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saidas" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-slate-400">Sem movimentações registradas.</p>
              )}
            </div>
            <div className="space-y-4">
              <MiniList title="Estoque baixo" empty="Nenhum item abaixo do mínimo." rows={inventoryList.filter((item: any) => item.quantity <= item.minStock).slice(0, 5).map((item: any) => ({ name: item.name, detail: `${item.quantity} ${item.unit || "un"} / mín. ${item.minStock}` }))} />
              <MiniList title="Produtos mais utilizados" empty="Sem consumo registrado." rows={mostUsedProducts.map(([name, quantity]) => ({ name, detail: `${quantity} un.` }))} />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-emerald-600" /> Obras</h3>
            <Link href="/work-orders" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">Abrir <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><p className="text-2xl font-bold">{runningWorks.length}</p><p className="text-xs font-bold text-slate-700">Em andamento</p></div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><p className="text-2xl font-bold">{finishedWorks.length}</p><p className="text-xs font-bold text-slate-700">Concluídas</p></div>
              <div className="rounded-xl bg-amber-50 p-3 text-amber-700"><p className="text-2xl font-bold">{scheduledWorks.length}</p><p className="text-xs font-bold text-slate-700">Agendadas</p></div>
            </div>
            <MiniList title="Últimas OS" empty="Nenhuma ordem de serviço cadastrada." rows={[...workOrdersList].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 5).map((item: any) => ({ name: `OS #${item.id} - ${item.clientName || "Cliente"}`, detail: item.status || "Sem status" }))} />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users className="w-4 h-4 text-violet-600" /> Equipe</h3>
            <Link href="/equipe-produtividade" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">Abrir <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <MiniList title="Produtividade por funcionário" empty="Sem produção lançada." rows={productivity.map(item => ({ name: item.name, detail: `${item.logs} registro(s), ${item.hours || 0}h, ${item.area || 0} m²` }))} />
            <MiniList title="Retiradas e devoluções pendentes" empty="Sem retiradas pendentes." rows={openWithdrawals.slice(0, 6).map((item: any) => ({ name: item.username || item.createdByUsername || "Funcionário", detail: `${item.status || "pendente"} - ${pendingReturns.includes(item) ? "devolução pendente" : "em aberto"}` }))} />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-orange-600" /> Vendas e Financeiro</h3>
            <Link href="/vendas-materiais" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">Abrir <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-violet-50 p-3 text-violet-700"><p className="text-2xl font-bold">{salesList.length}</p><p className="text-xs font-bold text-slate-700">Vendas de materiais</p></div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><p className="text-2xl font-bold">{formatBRL(approvedSales.reduce((sum: number, item: any) => sum + Number(item.total || 0), 0))}</p><p className="text-xs font-bold text-slate-700">Faturamento materiais</p></div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><p className="text-2xl font-bold">{receivedPayments.length}</p><p className="text-xs font-bold text-slate-700">Contas recebidas</p></div>
              <div className="rounded-xl bg-amber-50 p-3 text-amber-700"><p className="text-2xl font-bold">{pendingPayments.length}</p><p className="text-xs font-bold text-slate-700">Contas pendentes</p></div>
            </div>
            <MiniList title="Produtos mais vendidos" empty="Sem vendas de materiais registradas." rows={topSoldProducts.map(item => ({ name: item.name, detail: `${item.quantity} un. - ${formatBRL(item.total)}` }))} />
          </div>
        </section>
      </div>

      {/* ── Bottom grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Orçamentos */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" /> Orçamentos Recentes
            </h3>
            <Link href="/jobs" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentJobs.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">Nenhum orçamento cadastrado ainda.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{job.clientName}</p>
                    <p className="text-xs text-slate-400 truncate">{job.serviceType}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm font-bold text-slate-700">
                      {formatBRL(job.realPriceSold || job.calculatedPrice)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[job.status] || "bg-slate-100 text-slate-600"}`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right col: Ordens ativas + Estoque baixo */}
        <div className="space-y-4">
          {/* Ordens ativas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-500" /> Obras Ativas
              </h3>
              <Link href="/work-orders" className="text-xs text-primary font-semibold hover:underline">Ver todas</Link>
            </div>
            {recentOrders.filter((w: any) => !["Concluída", "Cancelada"].includes(w.status)).length === 0 ? (
              <p className="px-4 py-5 text-xs text-slate-400 text-center">Nenhuma obra ativa.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentOrders.filter((w: any) => !["Concluída", "Cancelada"].includes(w.status)).map((wo: any) => (
                  <div key={wo.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">OS #{wo.id} — {wo.clientName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{wo.serviceType}</p>
                    </div>
                    <span className={`ml-2 shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[wo.status] || "bg-slate-100 text-slate-600"}`}>
                      {wo.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alertas de Estoque */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-red-500" /> Estoque Baixo
              </h3>
              <Link href="/estoque/atual" className="text-xs text-primary font-semibold hover:underline">Estoque</Link>
            </div>
            {lowStock === 0 ? (
              <p className="px-4 py-5 text-xs text-emerald-600 font-semibold text-center flex items-center justify-center gap-1">
                ✓ Todos os itens dentro do mínimo
              </p>
            ) : (
              <div className="divide-y divide-slate-50">
                {inventoryList.filter((i: any) => i.quantity <= i.minStock).slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-xs font-semibold text-slate-700 truncate min-w-0 mr-2">{item.name}</p>
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      {item.quantity} / mín {item.minStock}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
