import { useState } from "react";
import { AlertTriangle, CalendarClock, ChevronDown, ChevronRight, Users } from "lucide-react";

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
    clientName: string | null;
    workOrderId: number | null;
    createdAt: string;
    notes: string | null;
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
      const responsibilityDate = withdrawal.withdrawalDate || withdrawal.createdAt;
      if (inHand > 0) {
        kit.items.push({
          productName: item.productName,
          unit: item.unit,
          qtyInHand: inHand,
          days: daysSince(responsibilityDate),
          withdrawalId: withdrawal.id,
          clientName: withdrawal.clientName,
          workOrderId: withdrawal.workOrderId,
          createdAt: responsibilityDate,
          notes: withdrawal.notes,
        });
      }
    }
  }

  return kits;
}

function formatResponsibilityDate(value: string) {
  const safeValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  return new Date(safeValue).toLocaleDateString("pt-BR");
}

export function ResponsibilityPanel({ pendingWithdrawals }: { pendingWithdrawals: Withdrawal[] }) {
  const employeeKits = buildEmployeeKits(pendingWithdrawals);
  const [openUserId, setOpenUserId] = useState<number | null>(employeeKits[0]?.userId || null);
  const [openToolKey, setOpenToolKey] = useState<string | null>(null);

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
          const groupedTools = Array.from(kit.items.reduce((map, item) => {
            const key = item.productName;
            const current = map.get(key) || { productName: item.productName, unit: item.unit, total: 0, details: [] as typeof kit.items };
            current.total += item.qtyInHand;
            current.details.push(item);
            map.set(key, current);
            return map;
          }, new Map<string, { productName: string; unit: string; total: number; details: typeof kit.items }>()).values());
          const expanded = openUserId === kit.userId;

          return (
            <Card key={kit.userId} className={`overflow-hidden ${hasOverdue ? "border-red-300" : ""}`} data-testid={`card-employee-kit-${kit.userId}`}>
              <div className={`h-1 ${hasOverdue ? "bg-red-500" : "bg-blue-500"}`} />
              <button type="button" onClick={() => setOpenUserId(expanded ? null : kit.userId)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-sm font-bold text-white">
                      {kit.username[0].toUpperCase()}
                    </div>
                    <span className="truncate">{kit.username}</span>
                    {hasOverdue && <Badge className="border-red-300 bg-red-100 text-xs text-red-700">Atrasado</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-fit">{groupedTools.length} ferramenta(s)</Badge>
                  <Badge variant="outline" className="w-fit">{totalInHand} unidade(s)</Badge>
                  {expanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                </div>
              </button>
              {expanded && (
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-2">
                    {groupedTools.map(tool => {
                      const toolKey = `${kit.userId}:${tool.productName}`;
                      const toolOpen = openToolKey === toolKey;
                      const maxDays = Math.max(...tool.details.map(item => item.days));
                      return (
                        <div key={toolKey} className={`rounded-lg border ${maxDays > 3 ? "border-red-200 bg-red-50" : "border-slate-200 bg-gray-50"}`}>
                          <button type="button" onClick={() => setOpenToolKey(toolOpen ? null : toolKey)} className="flex w-full items-center justify-between gap-3 p-3 text-left" data-testid={`row-kit-tool-${kit.userId}-${tool.productName}`}>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{tool.productName}</p>
                              <p className="text-xs text-gray-500">{tool.total} {tool.unit} em responsabilidade</p>
                            </div>
                            <div className="flex items-center gap-2 text-right">
                              {maxDays > 3 && <span className="text-xs font-semibold text-red-600">{maxDays}d</span>}
                              {toolOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            </div>
                          </button>
                          {toolOpen && (
                            <div className="space-y-2 border-t border-slate-200 p-3">
                              {tool.details.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((item, index) => (
                                <div key={`${item.withdrawalId}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md bg-white p-2 text-sm">
                                  <div>
                                    <p className="font-medium">{formatResponsibilityDate(item.createdAt)} - retirada #{item.withdrawalId}</p>
                                    <p className="text-xs text-gray-500">{item.workOrderId ? `OS #${item.workOrderId}` : item.clientName || "Sem destino vinculado"}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold">{item.qtyInHand} {item.unit}</p>
                                    <p className={`text-xs ${item.days > 3 ? "font-medium text-red-600" : "text-gray-400"}`}><CalendarClock className="mr-1 inline h-3 w-3" />{item.days}d</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-gray-600">Resumo geral e resolução</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Para resolver uma responsabilidade, registre o retorno como devolvido, perdido ou danificado. Valores de responsabilidade/desconto aparecem na aba Descontos para aprovação interna.
          </div>
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
