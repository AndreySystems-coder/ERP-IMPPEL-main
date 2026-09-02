import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShieldAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscountsPanel } from "@/features/materials/components/DiscountsPanel";
import { MaterialResponsibilityGovernance } from "@/features/materials/components/MaterialResponsibilityGovernance";
import type { DiscountRule, InventoryItem, SalaryDiscount, UserItem, Withdrawal, WorkOrder } from "@/features/materials/types";
import { asArray } from "@/lib/safeData";

export default function TeamGovernance() {
  const [tab, setTab] = useState("governanca");

  const inventoryQuery = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
  const usersQuery = useQuery<UserItem[]>({ queryKey: ["/api/users"] });
  const workOrdersQuery = useQuery<WorkOrder[]>({ queryKey: ["/api/work-orders"] });
  const withdrawalsQuery = useQuery<Withdrawal[]>({ queryKey: ["/api/material-withdrawals"] });
  const discountRulesQuery = useQuery<DiscountRule[]>({ queryKey: ["/api/salary-discount-rules"] });
  const salaryDiscountsQuery = useQuery<SalaryDiscount[]>({ queryKey: ["/api/salary-discounts"] });

  const inventory = asArray<InventoryItem>(inventoryQuery.data);
  const users = asArray<UserItem>(usersQuery.data);
  const workOrders = asArray<WorkOrder>(workOrdersQuery.data);
  const withdrawals = asArray<Withdrawal>(withdrawalsQuery.data);
  const discountRules = asArray<DiscountRule>(discountRulesQuery.data);
  const salaryDiscounts = asArray<SalaryDiscount>(salaryDiscountsQuery.data);
  const pendingDiscounts = salaryDiscounts.filter(discount => discount.status === "pendente");

  const isLoading = inventoryQuery.isLoading || usersQuery.isLoading || workOrdersQuery.isLoading || withdrawalsQuery.isLoading;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-900">
          <ShieldAlert className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Governança e Apuração</h1>
          <p className="text-sm text-gray-500">Responsabilidade sobre ferramentas/equipamentos e apuração de descontos salariais.</p>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-sm text-gray-400">Carregando...</CardContent></Card>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex w-full justify-start overflow-x-auto">
            <TabsTrigger value="governanca" className="shrink-0"><ShieldAlert className="mr-1 h-3 w-3" /> Governança de Materiais</TabsTrigger>
            <TabsTrigger value="descontos" className="relative shrink-0">
              <DollarSign className="mr-1 h-3 w-3" /> Apuração de Descontos
              {pendingDiscounts.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">{pendingDiscounts.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="governanca" className="mt-4">
            <MaterialResponsibilityGovernance inventory={inventory} users={users} workOrders={workOrders} withdrawals={withdrawals} />
          </TabsContent>

          <TabsContent value="descontos" className="mt-4">
            <DiscountsPanel
              discountRules={discountRules}
              salaryDiscounts={salaryDiscounts}
              loadingRules={discountRulesQuery.isLoading}
              loadingDiscounts={salaryDiscountsQuery.isLoading}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
