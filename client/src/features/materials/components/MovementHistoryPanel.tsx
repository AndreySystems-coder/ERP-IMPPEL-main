import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, History, Search, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MovementTimelineCard } from "@/features/materials/components/MovementTimelineCard";
import type { Withdrawal } from "@/features/materials/types";
import { isMaterialWithdrawalPending } from "@shared/materialReturnPolicy";

type StatusFilter = "todos" | "pendente" | "parcial" | "retornado" | "consumido";
type GroupMode = "none" | "day" | "month" | "year" | "workOrder" | "employee";

export function MovementHistoryPanel({
  withdrawals,
  title = "Histórico de movimentações",
  description = "Timeline de saídas, uso e devoluções registradas.",
  compact = false,
  groupByDay = false,
}: {
  withdrawals: Withdrawal[];
  title?: string;
  description?: string;
  compact?: boolean;
  groupByDay?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [groupMode, setGroupMode] = useState<GroupMode>(groupByDay ? "day" : "none");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return withdrawals
      .filter(withdrawal => status === "todos" || withdrawal.status === status)
      .filter(withdrawal => {
        if (!normalizedSearch) return true;
        const haystack = [
          String(withdrawal.id),
          withdrawal.username,
          withdrawal.clientName || "",
          withdrawal.workOrderId ? `os ${withdrawal.workOrderId}` : "",
          withdrawal.withdrawalDate || withdrawal.createdAt,
          new Date(`${withdrawal.withdrawalDate || withdrawal.createdAt}`).toLocaleDateString("pt-BR"),
          ...withdrawal.items.map(item => `${item.productName} ${item.quantity} ${item.unit} ${item.condition || ""}`),
        ].join(" ").toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .slice()
      .sort((a, b) => new Date(b.withdrawalDate || b.createdAt).getTime() - new Date(a.withdrawalDate || a.createdAt).getTime());
  }, [search, status, withdrawals]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Withdrawal[]>();
    filtered.forEach(withdrawal => {
      const date = new Date(`${withdrawal.withdrawalDate || withdrawal.createdAt}`);
      const day = date.toISOString().slice(0, 10);
      const key = groupMode === "year" ? day.slice(0, 4)
        : groupMode === "month" ? day.slice(0, 7)
        : groupMode === "workOrder" ? `OS ${withdrawal.workOrderId || "Sem OS"}`
        : groupMode === "employee" ? withdrawal.username
        : day;
      groups.set(key, [...(groups.get(key) || []), withdrawal]);
    });
    return Array.from(groups.entries()).sort(([left], [right]) => right.localeCompare(left));
  }, [filtered, groupMode]);

  const groupLabel = (key: string) => {
    if (groupMode === "day") return new Date(`${key}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    if (groupMode === "month") return new Date(`${key}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    if (groupMode === "year") return `Ano ${key}`;
    return key;
  };

  const pendingCount = withdrawals.filter(isMaterialWithdrawalPending).length;
  const returnedCount = withdrawals.filter(withdrawal => withdrawal.status === "retornado").length;

  if (withdrawals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <History className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="font-medium">Nenhuma movimentação registrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className={`${compact ? "text-base" : "text-lg"} font-bold text-blue-950`}>{title}</h2>
            <p className="mt-1 text-sm text-blue-700">{description}</p>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-orange-100 text-orange-700">{pendingCount} em uso</Badge>
            <Badge className="bg-green-100 text-green-700">{returnedCount} devolvidas</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_190px_210px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar por funcionário, material, cliente, OS ou número..."
            className="h-11 rounded-xl pl-9"
            data-testid="input-material-history-search"
          />
        </div>
        <Select value={status} onValueChange={value => setStatus(value as StatusFilter)}>
          <SelectTrigger className="h-11 rounded-xl" data-testid="select-material-history-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Em uso</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="retornado">Devolvidos</SelectItem>
            <SelectItem value="consumido">Consumidos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={groupMode} onValueChange={value => { setGroupMode(value as GroupMode); setSelectedGroup(null); }}>
          <SelectTrigger className="h-11 rounded-xl" data-testid="select-material-history-group"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem agrupamento</SelectItem>
            <SelectItem value="day">Agrupar por dia</SelectItem>
            <SelectItem value="month">Agrupar por mês</SelectItem>
            <SelectItem value="year">Agrupar por ano</SelectItem>
            <SelectItem value="workOrder">Agrupar por obra/OS</SelectItem>
            <SelectItem value="employee">Agrupar por funcionário</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs font-medium text-slate-500">
        {filtered.length} de {withdrawals.length} movimentação(ões)
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-400">
            <Search className="mx-auto mb-2 h-10 w-10 opacity-30" />
            <p>Nenhuma movimentação encontrada com os filtros atuais</p>
          </CardContent>
        </Card>
      ) : groupMode !== "none" ? (
        <div className="space-y-3">
          {grouped.map(([groupKey, groupWithdrawals]) => {
            const expanded = selectedGroup === groupKey;
            const employees = new Set(groupWithdrawals.map(withdrawal => withdrawal.username));
            return (
              <div key={groupKey} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <button type="button" onClick={() => setSelectedGroup(expanded ? null : groupKey)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50" data-testid={`button-open-withdrawals-group-${groupKey}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700"><CalendarDays className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold capitalize text-slate-900">{groupLabel(groupKey)}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{groupWithdrawals.length} retirada(s)</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {employees.size} funcionário(s)</span>
                    </div>
                  </div>
                  {expanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                </button>
                {expanded && <div className="space-y-3 border-t border-slate-100 bg-slate-50 p-3">{groupWithdrawals.map(withdrawal => <MovementTimelineCard key={withdrawal.id} withdrawal={withdrawal} />)}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(withdrawal => (
            <MovementTimelineCard key={withdrawal.id} withdrawal={withdrawal} />
          ))}
        </div>
      )}
    </div>
  );
}
