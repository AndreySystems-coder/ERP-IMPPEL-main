import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLogout } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { LogOut, MapPin, Calendar, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const apiRequest = async (method: string, path: string) => {
  const res = await fetch(path, { method, credentials: "include" });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
};

export default function MobileJobs() {
  const [, setLocation] = useLocation();
  const logout = useLogout();
  const { data: workOrders = [] } = useQuery({
    queryKey: ["/api/work-orders"],
    queryFn: () => apiRequest("GET", "/api/work-orders"),
  });

  const statusColors: Record<string, { bg: string; text: string }> = {
    Planejada: { bg: "bg-blue-100", text: "text-blue-700" },
    Agendada: { bg: "bg-amber-100", text: "text-amber-700" },
    "Em Andamento": { bg: "bg-primary/10", text: "text-primary" },
    Concluída: { bg: "bg-emerald-100", text: "text-emerald-700" },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-primary text-white sticky top-0 z-10 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Minhas Ordens</h1>
            <p className="text-xs text-primary-100">Total: {workOrders.length}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout.mutate()}
            className="text-white hover:bg-primary-600"
            data-testid="button-mobile-logout"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="p-4 space-y-3">
        {workOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-500">Nenhuma ordem de serviço atribuída</p>
            </CardContent>
          </Card>
        ) : (
          workOrders.map((wo: any) => {
            const colors = statusColors[wo.status] || statusColors["Planejada"];
            return (
              <Card
                key={wo.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation(`/mobile/job/${wo.id}`)}
                data-testid={`card-mobile-job-${wo.id}`}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900">{wo.clientName}</h3>
                        <p className="text-sm text-slate-600">{wo.serviceType}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${colors.bg} ${colors.text}`}
                      >
                        {wo.status}
                      </span>
                    </div>

                    {wo.address && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{wo.address}</span>
                      </div>
                    )}

                    {wo.scheduledDate && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(wo.scheduledDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    )}

                    {wo.teamAssigned && (
                      <p className="text-xs text-slate-500">👥 {wo.teamAssigned}</p>
                    )}

                    <div className="pt-2 flex items-center text-primary font-semibold text-sm">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Ver detalhes
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
