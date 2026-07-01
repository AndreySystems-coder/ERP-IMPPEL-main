import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, ClipboardList, DollarSign, History, Package, Sparkles, Users } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscountsPanel } from "@/features/materials/components/DiscountsPanel";
import { EmployeeView } from "@/features/materials/components/EmployeeView";
import { MaterialFlowStepper } from "@/features/materials/components/MaterialFlowStepper";
import { MovementHistoryPanel } from "@/features/materials/components/MovementHistoryPanel";
import { ResponsibilityPanel } from "@/features/materials/components/ResponsibilityPanel";
import { ReturnForm } from "@/features/materials/components/ReturnForm";
import { WithdrawalForm } from "@/features/materials/components/WithdrawalForm";
import MobileNotesImport from "@/pages/MobileNotesImport";
import { daysSince } from "@/features/materials/material-control-utils";
import type { DiscountRule, InventoryItem, SalaryDiscount, UserItem, Withdrawal, WorkOrder } from "@/features/materials/types";
import { isMaterialWithdrawalPending } from "@shared/materialReturnPolicy";
import { useUser } from "@/hooks/use-auth";
import { asArray } from "@/lib/safeData";

type InventoryMovement = {
  id: number;
  inventoryId: number;
  productName: string;
  type: string;
  quantity: number;
  date: string;
  notes?: string | null;
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function monthKey(year: string, month: string) {
  return `${year}-${month.padStart(2, "0")}`;
}

function operationalDate(value?: string | null) {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : value.slice(0, 10);
}

function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function LoadingState() {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-gray-400">
        Carregando controle de materiais...
      </CardContent>
    </Card>
  );
}

function ErrorState() {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="py-8 text-center text-sm text-red-700">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
        Não foi possível carregar os dados de materiais. Tente atualizar a página.
      </CardContent>
    </Card>
  );
}

export default function MaterialControl() {
  const { data: currentUser } = useUser();
  const isAdmin = (currentUser as any)?.role === "admin";
  const [tab, setTab] = useState("diario");
  const now = new Date();
  const [reportMonth, setReportMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [reportYear, setReportYear] = useState(String(now.getFullYear()));

  const inventoryQuery = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
  const usersQuery = useQuery<UserItem[]>({ queryKey: ["/api/users"], enabled: isAdmin });
  const workOrdersQuery = useQuery<WorkOrder[]>({ queryKey: ["/api/work-orders"] });
  const withdrawalsQuery = useQuery<Withdrawal[]>({ queryKey: ["/api/material-withdrawals"] });
  const movementsQuery = useQuery<InventoryMovement[]>({ queryKey: ["/api/inventory-movements"], enabled: isAdmin });
  const discountRulesQuery = useQuery<DiscountRule[]>({ queryKey: ["/api/salary-discount-rules"], enabled: isAdmin });
  const salaryDiscountsQuery = useQuery<SalaryDiscount[]>({ queryKey: ["/api/salary-discounts"], enabled: isAdmin });

  const inventory = asArray<InventoryItem>(inventoryQuery.data);
  const users = usersQuery.data ? asArray<UserItem>(usersQuery.data) : (currentUser ? [currentUser as UserItem] : []);
  const workOrders = asArray<WorkOrder>(workOrdersQuery.data);
  const withdrawals = asArray<Withdrawal>(withdrawalsQuery.data);
  const movements = asArray<InventoryMovement>(movementsQuery.data);
  const discountRules = asArray<DiscountRule>(discountRulesQuery.data);
  const salaryDiscounts = asArray<SalaryDiscount>(salaryDiscountsQuery.data);

  const pendingWithdrawals = withdrawals.filter(isMaterialWithdrawalPending);
  const pendingDiscounts = salaryDiscounts.filter(discount => discount.status === "pendente");
  const returnedCount = withdrawals.filter(withdrawal => withdrawal.status === "retornado").length;
  const consumedCount = withdrawals.filter(withdrawal => withdrawal.status === "consumido").length;
  const overdueCount = pendingWithdrawals.filter(withdrawal => daysSince(withdrawal.withdrawalDate || withdrawal.createdAt) > 3).length;

  const isLoadingCore = inventoryQuery.isLoading || (isAdmin && usersQuery.isLoading) || workOrdersQuery.isLoading || withdrawalsQuery.isLoading;
  const hasCoreError = inventoryQuery.isError || (isAdmin && usersQuery.isError) || workOrdersQuery.isError || withdrawalsQuery.isError;

  const buildMonthlyPayload = () => {
    const key = monthKey(reportYear, reportMonth);
    const monthlyWithdrawals = withdrawals.filter(withdrawal => operationalDate(withdrawal.withdrawalDate || withdrawal.createdAt).startsWith(key));
    const monthlyConsumption = movements.filter(movement => {
      const date = operationalDate(movement.date);
      const isConsumption = String(movement.type).toUpperCase() === "SAÍDA" || String(movement.type).toUpperCase() === "SAIDA";
      const fromWithdrawal = String(movement.notes || "").toLowerCase().includes("retirada #");
      return date.startsWith(key) && isConsumption && !fromWithdrawal;
    });
    const days = new Map<string, { withdrawals: Withdrawal[]; consumption: InventoryMovement[] }>();
    for (const withdrawal of monthlyWithdrawals) {
      const date = operationalDate(withdrawal.withdrawalDate || withdrawal.createdAt);
      const group = days.get(date) || { withdrawals: [], consumption: [] };
      group.withdrawals.push(withdrawal);
      days.set(date, group);
    }
    for (const movement of monthlyConsumption) {
      const date = operationalDate(movement.date);
      const group = days.get(date) || { withdrawals: [], consumption: [] };
      group.consumption.push(movement);
      days.set(date, group);
    }
    return {
      module: "controle-materiais",
      month: reportMonth,
      year: reportYear,
      label: `${MONTHS[Number(reportMonth) - 1]}/${reportYear}`,
      withdrawals: monthlyWithdrawals,
      consumption: monthlyConsumption,
      days: Array.from(days.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([date, group]) => ({ date, ...group })),
      generatedAt: new Date().toISOString(),
    };
  };

  const exportMonthlyJson = () => {
    const payload = buildMonthlyPayload();
    downloadJson(`Controle_Materiais_${reportYear}-${reportMonth}.json`, payload);
  };

  const exportMonthlyPdf = () => {
    const payload = buildMonthlyPayload();
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("IMPPEL - Controle de Materiais", 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Referencia: ${payload.label}`, 14, 23);
    doc.text(`Gerado em: ${new Date(payload.generatedAt).toLocaleString("pt-BR")}`, 14, 29);

    let y = 38;
    if (payload.days.length === 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Nenhum registro encontrado para o mes selecionado.", 14, y);
    } else {
      for (const day of payload.days) {
        if (y > 250) { doc.addPage(); y = 18; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(new Date(`${day.date}T12:00:00`).toLocaleDateString("pt-BR"), 14, y);
        y += 5;

        const rows: string[][] = [];
        for (const withdrawal of day.withdrawals) {
          rows.push([
            withdrawal.username,
            `Retirada #${withdrawal.id}`,
            withdrawal.items.map(item => `${item.quantity}x ${item.productName}`).join(", "),
            withdrawal.status,
          ]);
        }
        if (day.consumption.length > 0) {
          rows.push([
            "Saidas de consumo",
            "-",
            day.consumption.map(item => `${item.quantity}x ${item.productName}`).join(", "),
            "consumo",
          ]);
        }
        autoTable(doc, {
          startY: y,
          head: [["Responsavel", "Identificador", "Materiais", "Status"]],
          body: rows,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [30, 58, 138], textColor: 255 },
          columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 28 }, 2: { cellWidth: 92 }, 3: { cellWidth: 25 } },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }
    }
    doc.save(`Controle_Materiais_${reportYear}-${reportMonth}.pdf`);
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        {hasCoreError ? (
          <ErrorState />
        ) : isLoadingCore ? (
          <LoadingState />
        ) : (
          <EmployeeView
            inventory={inventory}
            users={users}
            workOrders={workOrders}
            currentUser={currentUser as any}
            withdrawals={withdrawals}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-900">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">Controle de Materiais</h1>
            <p className="text-sm text-gray-500">Saídas, devoluções, responsabilidade e descontos</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center sm:flex sm:items-center sm:gap-5">
          <div>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-pending-count">{pendingWithdrawals.length}</div>
            <div className="text-xs text-gray-500">Pendentes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600" data-testid="text-overdue-count">{overdueCount}</div>
            <div className="text-xs text-gray-500">Atrasados</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending-discounts-count">{pendingDiscounts.length}</div>
            <div className="text-xs text-gray-500">Descontos</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{returnedCount}</div>
            <div className="text-xs text-gray-500">Retornados</div>
          </div>
        </div>
      </div>

      {hasCoreError ? (
        <ErrorState />
      ) : isLoadingCore ? (
        <LoadingState />
      ) : (
        <>
          <MaterialFlowStepper pendingCount={pendingWithdrawals.length} returnedCount={returnedCount} overdueCount={overdueCount} />

          <Card className="border-blue-100 bg-blue-50">
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-blue-950">Relatorio mensal do Controle de Materiais</h2>
                <p className="text-sm text-blue-700">Escolha mes e ano para PDF/JSON usando datas operacionais das retiradas e movimentacoes.</p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs font-semibold text-blue-900">Mes
                  <select value={reportMonth} onChange={event => setReportMonth(event.target.value)} className="mt-1 h-10 rounded-md border border-blue-200 bg-white px-3 text-sm">
                    {MONTHS.map((label, index) => <option key={label} value={String(index + 1).padStart(2, "0")}>{label}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-blue-900">Ano
                  <input value={reportYear} onChange={event => setReportYear(event.target.value.replace(/\D/g, "").slice(0, 4))} className="mt-1 h-10 w-24 rounded-md border border-blue-200 bg-white px-3 text-sm" />
                </label>
                <Button type="button" variant="outline" onClick={exportMonthlyJson}>JSON</Button>
                <Button type="button" onClick={exportMonthlyPdf}>PDF mensal</Button>
              </div>
            </CardContent>
          </Card>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex w-full justify-start overflow-x-auto">
              <TabsTrigger value="diario" data-testid="tab-controle-diario" className="shrink-0"><ClipboardList className="mr-1 h-3 w-3" /> Controle Diário</TabsTrigger>
              <TabsTrigger value="saida" data-testid="tab-saida" className="shrink-0"><ArrowDownCircle className="mr-1 h-3 w-3" /> Saídas</TabsTrigger>
              <TabsTrigger value="rapido" data-testid="tab-registro-rapido" className="shrink-0"><Sparkles className="mr-1 h-3 w-3" /> Registro Rápido</TabsTrigger>
              <TabsTrigger value="retorno" data-testid="tab-retorno" className="shrink-0"><ArrowUpCircle className="mr-1 h-3 w-3" /> Retorno</TabsTrigger>
              <TabsTrigger value="responsabilidade" data-testid="tab-responsabilidade" className="shrink-0"><Users className="mr-1 h-3 w-3" /> Responsabilidades</TabsTrigger>
              <TabsTrigger value="descontos" data-testid="tab-descontos" className="relative shrink-0">
                <DollarSign className="mr-1 h-3 w-3" /> Descontos
                {pendingDiscounts.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">{pendingDiscounts.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="historico" data-testid="tab-historico" className="shrink-0"><History className="mr-1 h-3 w-3" /> Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="diario" className="mt-4 space-y-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <h2 className="text-base font-bold text-slate-900">Controle Diário de Materiais</h2>
                <p className="text-sm text-slate-600">Registre manualmente os materiais levados pelos funcionários.</p>
              </div>
              <WithdrawalForm inventory={inventory} users={users} workOrders={workOrders} currentUser={currentUser as any} isAdmin={true} />
            </TabsContent>

            <TabsContent value="saida" className="mt-4">
              <MovementHistoryPanel
                withdrawals={pendingWithdrawals}
                title="Saídas em aberto"
                description="Materiais que saíram com funcionários e ainda aguardam retorno, conferência ou responsabilidade."
                groupByDay
              />
            </TabsContent>

            <TabsContent value="rapido" className="mt-4">
              <MobileNotesImport embedded />
            </TabsContent>

            <TabsContent value="retorno" className="mt-4">
              <ReturnForm pendingWithdrawals={pendingWithdrawals} currentUser={currentUser as any} isAdmin={true} />
            </TabsContent>

            <TabsContent value="responsabilidade" className="mt-4">
              <ResponsibilityPanel pendingWithdrawals={pendingWithdrawals} />
            </TabsContent>

            <TabsContent value="descontos" className="mt-4">
              <DiscountsPanel
                discountRules={discountRules}
                salaryDiscounts={salaryDiscounts}
                loadingRules={discountRulesQuery.isLoading}
                loadingDiscounts={salaryDiscountsQuery.isLoading}
              />
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              <MovementHistoryPanel
                withdrawals={withdrawals}
                title="Histórico de movimentações"
                description="Timeline completa por retirada: saída, período em uso e devolução quando registrada."
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
