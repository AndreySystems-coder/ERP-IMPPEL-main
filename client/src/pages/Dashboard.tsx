import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  DollarSign, TrendingUp, Activity, Briefcase, Users, Target,
  Package, AlertTriangle, Plus, ClipboardList, Warehouse, CheckSquare,
  ArrowRight, Calendar, ChevronRight, BarChart2, FileText, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { asArray } from "@/lib/safeData";

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

export default function Dashboard() {
  const { data: metrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: () => apiGet("/api/dashboard/metrics"),
  });
  const { data: jobs = [] } = useQuery({ queryKey: ["/api/jobs"], queryFn: () => apiGet("/api/jobs") });
  const { data: workOrders = [] } = useQuery({ queryKey: ["/api/work-orders"], queryFn: () => apiGet("/api/work-orders") });
  const { data: inventory = [] } = useQuery({ queryKey: ["/api/inventory"], queryFn: () => apiGet("/api/inventory") });
  const { data: leads = [] } = useQuery({ queryKey: ["/api/leads"], queryFn: () => apiGet("/api/leads") });

  const jobsList = asArray<any>(jobs);
  const workOrdersList = asArray<any>(workOrders);
  const inventoryList = asArray<any>(inventory);
  const leadsList = asArray<any>(leads);

  const pendingJobs = jobsList.filter((j: any) => ["Lead", "Proposta", "Negociação"].includes(j.status)).length;
  const activeOrders = workOrdersList.filter((w: any) => ["Em Andamento", "Agendada"].includes(w.status)).length;
  const lowStock = inventoryList.filter((i: any) => i.quantity <= i.minStock).length;
  const newLeads = leadsList.filter((l: any) => ["New Lead", "Contacted"].includes(l.status)).length;
  const recentJobs = [...jobsList].sort((a, b) => b.id - a.id).slice(0, 5);
  const recentOrders = [...workOrdersList].sort((a, b) => b.id - a.id).slice(0, 4);
  const weekday = format(new Date(), "EEEE", { locale: ptBR });
  const formattedDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

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
