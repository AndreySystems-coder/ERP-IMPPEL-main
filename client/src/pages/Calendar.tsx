import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, MapPin, Users as UsersIcon, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { asArray } from "@/lib/safeData";
import { StatusPill } from "@/components/ui/status-pill";
import { workOrderStatusVariant } from "@/features/work-orders/constants";

const apiRequest = async (method: string, path: string) => {
  const res = await fetch(path, { method });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
};

export default function Calendar() {
  const { data: workOrders = [] } = useQuery({
    queryKey: ["/api/work-orders"],
    queryFn: () => apiRequest("GET", "/api/work-orders"),
  });
  const workOrdersList = asArray<any>(workOrders);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("weekly");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [detailDay, setDetailDay] = useState<Date | null>(null);

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    Planejada: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    Agendada: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    "Em Andamento": { bg: "bg-primary/5", text: "text-primary", border: "border-primary/20" },
    Concluída: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    Recusado: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getOrdersForDate = (date: Date) => {
    return workOrdersList.filter((wo: any) => {
      if (!wo.scheduledDate) return false;
      return isSameDay(new Date(wo.scheduledDate), date);
    });
  };

  const dailyOrders = getOrdersForDate(selectedDate);
  const weeklyOrdersByDay = useMemo(
    () =>
      weekDays.reduce(
        (acc, day) => {
          acc[day.toISOString().split("T")[0]] = getOrdersForDate(day);
          return acc;
        },
        {} as Record<string, any[]>
      ),
    [weekDays, workOrdersList]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-primary" />
            Agenda de Serviços
          </h1>
          <p className="text-slate-500 mt-1">Visualize e gerencie as ordens de serviço por data.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "daily" ? "primary" : "outline"}
            onClick={() => setViewMode("daily")}
            size="sm"
            data-testid="button-daily-view"
          >
            Diária
          </Button>
          <Button
            variant={viewMode === "weekly" ? "primary" : "outline"}
            onClick={() => setViewMode("weekly")}
            size="sm"
            data-testid="button-weekly-view"
          >
            Semanal
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (viewMode === "daily") {
              setSelectedDate((d) => addDays(d, -1));
            } else {
              setCurrentDate((d) => subWeeks(d, 1));
            }
          }}
          data-testid="button-prev-period"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <p className="font-bold text-slate-900">
            {viewMode === "daily"
              ? format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              : `${format(weekStart, "dd 'de' MMMM", { locale: ptBR })} - ${format(
                  weekEnd,
                  "dd 'de' MMMM 'de' yyyy",
                  { locale: ptBR }
                )}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (viewMode === "daily") {
              setSelectedDate((d) => addDays(d, 1));
            } else {
              setCurrentDate((d) => addWeeks(d, 1));
            }
          }}
          data-testid="button-next-period"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Daily View */}
      {viewMode === "daily" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {dailyOrders.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Nenhuma ordem agendada para este dia</p>
                ) : (
                  dailyOrders.map((wo: any) => {
                    const colors = statusColors[wo.status] || statusColors["Planejada"];
                    return (
                      <div
                        key={wo.id}
                        className={`p-4 rounded-lg border-2 ${colors.bg} ${colors.border}`}
                        data-testid={`daily-order-${wo.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className={`font-bold ${colors.text}`}>{wo.clientName}</p>
                            <p className="text-sm text-slate-600 mt-1">{wo.serviceType}</p>
                            {wo.address && <p className="text-xs text-slate-500 mt-1">{wo.address}</p>}
                          </div>
                          <StatusPill label={wo.status} variant={workOrderStatusVariant(wo.status)} />
                        </div>
                        {wo.teamAssigned && (
                          <p className="text-xs text-slate-600 mt-3 pt-2 border-t border-current/10">
                            👥 Equipe: {wo.teamAssigned}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly View */}
      {viewMode === "weekly" && (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div className={`grid grid-cols-7 gap-3 transition-all duration-300 ${detailDay ? "lg:flex-[1.6]" : "flex-1"} w-full`}>
            {weekDays.map((day) => {
              const dayKey = day.toISOString().split("T")[0];
              const orders = weeklyOrdersByDay[dayKey] || [];
              const isToday = isSameDay(day, new Date());
              const isSelected = detailDay ? isSameDay(day, detailDay) : false;

              return (
                <Card
                  key={dayKey}
                  className={`overflow-hidden cursor-pointer transition-all ${
                    isSelected ? "ring-2 ring-primary" : ""
                  } ${isToday ? "border-primary border-2" : ""}`}
                  onClick={() => setDetailDay(day)}
                  data-testid={`weekly-day-${dayKey}`}
                >
                  <CardContent className="p-4">
                    <p
                      className={`text-sm font-bold ${
                        isToday ? "text-primary" : "text-slate-600"
                      }`}
                    >
                      {format(day, "EEE", { locale: ptBR })}
                    </p>
                    <p className="text-xl font-display font-bold text-slate-900">
                      {format(day, "dd")}
                    </p>
                    <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                      {orders.length === 0 ? (
                        <p className="text-xs text-slate-400">-</p>
                      ) : (
                        orders.map((wo: any) => {
                          const colors = statusColors[wo.status] || statusColors["Planejada"];
                          return (
                            <div
                              key={wo.id}
                              className={`text-xs p-1.5 rounded border ${colors.bg} ${colors.text} ${colors.border} border-1 truncate`}
                              title={wo.clientName}
                              data-testid={`weekly-order-${wo.id}`}
                            >
                              {wo.clientName}
                            </div>
                          );
                        })
                      )}
                    </div>
                    {orders.length > 0 && (
                      <p className="text-xs text-slate-500 mt-2 font-semibold">
                        {orders.length} ordem{orders.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {detailDay && (
            <Card className="w-full lg:w-80 shrink-0 lg:sticky lg:top-4">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      {format(detailDay, "EEEE", { locale: ptBR })}
                    </p>
                    <p className="text-lg font-display font-bold text-slate-900">
                      {format(detailDay, "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailDay(null)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Fechar painel do dia"
                    data-testid="button-close-day-detail"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {getOrdersForDate(detailDay).length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                      Nenhuma ordem de serviço registrada para este dia.
                    </p>
                  ) : (
                    getOrdersForDate(detailDay).map((wo: any) => {
                      const colors = statusColors[wo.status] || statusColors["Planejada"];
                      return (
                        <div key={wo.id} className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className={`font-bold ${colors.text}`}>{wo.clientName}</p>
                            <StatusPill label={wo.status} variant={workOrderStatusVariant(wo.status)} className="shrink-0" />
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{wo.serviceType}</p>
                          {wo.address && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="h-3 w-3 shrink-0" /> {wo.address}
                            </p>
                          )}
                          {wo.teamAssigned && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <UsersIcon className="h-3 w-3 shrink-0" /> {wo.teamAssigned}
                            </p>
                          )}
                          <Link
                            href="/work-orders"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            Abrir Ordem de Serviço <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {Object.entries(statusColors).map(([status, colors]) => {
          const count = workOrdersList.filter((wo: any) => wo.status === status).length;
          return (
            <Card key={status}>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-600 mb-1">{status}</p>
                <p className={`text-2xl font-bold ${colors.text}`}>{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
