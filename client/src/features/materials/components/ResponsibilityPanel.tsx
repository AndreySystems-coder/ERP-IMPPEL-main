import { AlertTriangle, CalendarClock, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysSince } from "@/features/materials/material-control-utils";
import type { Withdrawal } from "@/features/materials/types";

type EmployeeKit = {
  username: string;
  userId: number;
  items: {
    productName: string;
    unit: string;
    qtyInHand: number;
    days: number;
    withdrawalId: number;
  }[];
};

function buildEmployeeKits(withdrawals: Withdrawal[]) {
  const kits: EmployeeKit[] = [];

  for (const withdrawal of withdrawals) {
    let kit = kits.find(item => item.userId === withdrawal.userId);
    if (!kit) {
      kit = { username: withdrawal.username, userId: withdrawal.userId, items: [] };
      kits.push(kit);
    }

    for (const item of withdrawal.items) {
      const returned = item.returnedQuantity ?? 0;
      const inHand = item.quantity - returned;
      if (inHand > 0) {
        kit.items.push({
          productName: item.productName,
          unit: item.unit,
          qtyInHand: inHand,
          days: daysSince(withdrawal.createdAt),
          withdrawalId: withdrawal.id,
        });
      }
    }
  }

  return kits;
}

export function ResponsibilityPanel({ pendingWithdrawals }: { pendingWithdrawals: Withdrawal[] }) {
  const employeeKits = buildEmployeeKits(pendingWithdrawals);

  if (employeeKits.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="font-medium">Nenhum funcionário com materiais pendentes</p>
          <p className="mt-1 text-sm text-gray-400">Quando houver saídas em aberto, elas aparecerão aqui por responsável.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Kit de responsabilidade por funcionário</h2>
        <Badge variant="outline" className="w-fit border-orange-300 text-orange-600">
          {employeeKits.length} funcionário(s) com materiais
        </Badge>
      </div>

      <div className="space-y-4">
        {employeeKits.map(kit => {
          const hasOverdue = kit.items.some(item => item.days > 3);
          const totalInHand = kit.items.reduce((sum, item) => sum + item.qtyInHand, 0);

          return (
            <Card key={kit.userId} className={`overflow-hidden ${hasOverdue ? "border-red-300" : ""}`} data-testid={`card-employee-kit-${kit.userId}`}>
              <div className={`h-1 ${hasOverdue ? "bg-red-500" : "bg-blue-500"}`} />
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-col gap-3 text-base sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-sm font-bold text-white">
                      {kit.username[0].toUpperCase()}
                    </div>
                    <span className="truncate">{kit.username}</span>
                    {hasOverdue && <Badge className="border-red-300 bg-red-100 text-xs text-red-700">Atrasado</Badge>}
                  </div>
                  <Badge variant="outline" className="w-fit">{totalInHand} itens em mãos</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {kit.items.map((item, index) => (
                    <div
                      key={`${item.withdrawalId}-${index}`}
                      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg p-3 ${item.days > 3 ? "border border-red-200 bg-red-50" : "bg-gray-50"}`}
                      data-testid={`row-kit-item-${kit.userId}-${index}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.productName}</p>
                        <p className="text-xs text-gray-500">Saída #{item.withdrawalId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{item.qtyInHand} {item.unit}</p>
                        <p className={`text-xs ${item.days > 3 ? "font-medium text-red-600" : "text-gray-400"}`}>
                          <CalendarClock className="mr-1 inline h-3 w-3" />{item.days}d atrás
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {hasOverdue && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      {kit.username} possui materiais há mais de 3 dias sem retorno.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-gray-600">Resumo geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="py-1 text-left">Funcionário</th>
                  <th className="py-1 text-right">Itens em mãos</th>
                  <th className="py-1 text-right">Saídas pendentes</th>
                  <th className="py-1 text-right">Mais antiga</th>
                </tr>
              </thead>
              <tbody>
                {employeeKits.map(kit => {
                  const userWithdrawals = pendingWithdrawals.filter(withdrawal => withdrawal.userId === kit.userId);
                  const maxDays = Math.max(...kit.items.map(item => item.days));

                  return (
                    <tr key={kit.userId} className="border-b last:border-0" data-testid={`row-summary-${kit.userId}`}>
                      <td className="py-2 font-medium">{kit.username}</td>
                      <td className="py-2 text-right">{kit.items.reduce((sum, item) => sum + item.qtyInHand, 0)}</td>
                      <td className="py-2 text-right">{userWithdrawals.length}</td>
                      <td className={`py-2 text-right ${maxDays > 3 ? "font-medium text-red-600" : ""}`}>{maxDays}d</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
