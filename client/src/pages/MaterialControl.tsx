import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, DollarSign, History, Package, Users } from "lucide-react";

import BackupManager from "@/components/BackupManager";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscountsPanel } from "@/features/materials/components/DiscountsPanel";
import { EmployeeView } from "@/features/materials/components/EmployeeView";
import { MaterialFlowStepper } from "@/features/materials/components/MaterialFlowStepper";
import { MovementHistoryPanel } from "@/features/materials/components/MovementHistoryPanel";
import { ResponsibilityPanel } from "@/features/materials/components/ResponsibilityPanel";
import { ReturnForm } from "@/features/materials/components/ReturnForm";
import { WithdrawalForm } from "@/features/materials/components/WithdrawalForm";
import { daysSince } from "@/features/materials/material-control-utils";
import type { DiscountRule, InventoryItem, SalaryDiscount, UserItem, Withdrawal, WorkOrder } from "@/features/materials/types";
import { useUser } from "@/hooks/use-auth";

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
  const [tab, setTab] = useState("saida");

  const inventoryQuery = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
  const usersQuery = useQuery<UserItem[]>({ queryKey: ["/api/users"] });
  const workOrdersQuery = useQuery<WorkOrder[]>({ queryKey: ["/api/work-orders"] });
  const withdrawalsQuery = useQuery<Withdrawal[]>({ queryKey: ["/api/material-withdrawals"] });
  const discountRulesQuery = useQuery<DiscountRule[]>({ queryKey: ["/api/salary-discount-rules"] });
  const salaryDiscountsQuery = useQuery<SalaryDiscount[]>({ queryKey: ["/api/salary-discounts"] });

  const inventory = inventoryQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const workOrders = workOrdersQuery.data ?? [];
  const withdrawals = withdrawalsQuery.data ?? [];
  const discountRules = discountRulesQuery.data ?? [];
  const salaryDiscounts = salaryDiscountsQuery.data ?? [];

  const pendingWithdrawals = withdrawals.filter(withdrawal => withdrawal.status !== "retornado");
  const pendingDiscounts = salaryDiscounts.filter(discount => discount.status === "pendente");
  const returnedCount = withdrawals.filter(withdrawal => withdrawal.status === "retornado").length;
  const overdueCount = pendingWithdrawals.filter(withdrawal => daysSince(withdrawal.createdAt) > 3).length;

  const isLoadingCore = inventoryQuery.isLoading || usersQuery.isLoading || workOrdersQuery.isLoading || withdrawalsQuery.isLoading;
  const hasCoreError = inventoryQuery.isError || usersQuery.isError || workOrdersQuery.isError || withdrawalsQuery.isError;

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
          <BackupManager type="materiais" label="Controle de Materiais" isAdmin={isAdmin} />
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

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex w-full justify-start overflow-x-auto">
              <TabsTrigger value="saida" data-testid="tab-saida" className="shrink-0"><ArrowDownCircle className="mr-1 h-3 w-3" /> Saída</TabsTrigger>
              <TabsTrigger value="retorno" data-testid="tab-retorno" className="shrink-0"><ArrowUpCircle className="mr-1 h-3 w-3" /> Retorno</TabsTrigger>
              <TabsTrigger value="responsabilidade" data-testid="tab-responsabilidade" className="shrink-0"><Users className="mr-1 h-3 w-3" /> Responsabilidade</TabsTrigger>
              <TabsTrigger value="descontos" data-testid="tab-descontos" className="relative shrink-0">
                <DollarSign className="mr-1 h-3 w-3" /> Descontos
                {pendingDiscounts.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">{pendingDiscounts.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="historico" data-testid="tab-historico" className="shrink-0"><History className="mr-1 h-3 w-3" /> Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="saida" className="mt-4">
              <WithdrawalForm inventory={inventory} users={users} workOrders={workOrders} currentUser={currentUser as any} isAdmin={true} />
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
