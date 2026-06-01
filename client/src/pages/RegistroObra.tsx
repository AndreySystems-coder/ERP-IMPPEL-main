import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/Button";
import {
  ClipboardList, Package, CheckCircle, Clock, Play,
  UserCheck, History, X, ChevronRight, Briefcase,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ServiceProgress {
  serviceName: string;
  started: boolean;
  startDate?: string;
  endDate?: string;
  finished: boolean;
  realMaterials: { name: string; inventoryId?: number; plannedQty: number; realQty: number }[];
  observations?: string;
}

interface WOMaterial {
  inventoryId?: number;
  name: string;
  quantity: number;
  unit: string;
  inventoryUnit?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ceilQty(n: number): number {
  if (!n || n <= 0) return 0;
  return Math.ceil(n);
}

function buildProgressFromJob(wo: any, job: any | null): ServiceProgress[] {
  const mats: WOMaterial[] = [];
  try { if (wo.materialsNeeded) mats.push(...JSON.parse(wo.materialsNeeded)); } catch {}

  const serviceItems: any[] = [];
  try { if (job?.serviceItems) serviceItems.push(...JSON.parse(job.serviceItems)); } catch {}

  if (serviceItems.length === 0) {
    return [{
      serviceName: wo.serviceType || "Serviço principal",
      started: false, startDate: "", endDate: "", finished: false,
      realMaterials: mats.map(m => ({ name: m.name, inventoryId: m.inventoryId, plannedQty: ceilQty(m.quantity), realQty: 0 })),
      observations: "",
    }];
  }

  const totalArea = serviceItems.reduce((s: number, svc: any) => s + (Number(svc.area) || 0), 0);
  return serviceItems.map((svc: any) => {
    const ratio = totalArea > 0 ? (Number(svc.area) || 0) / totalArea : 1 / serviceItems.length;
    const label = [svc.lugar, svc.name].filter(Boolean).join(": ");
    return {
      serviceName: label || "Serviço",
      started: false, startDate: "", endDate: "", finished: false,
      realMaterials: mats.map(m => ({
        name: m.name,
        inventoryId: m.inventoryId,
        plannedQty: ceilQty(m.quantity * ratio),
        realQty: 0,
      })),
      observations: "",
    };
  });
}

const GENERIC_NAMES = new Set(["Serviço principal", "Serviço", "Multi-serviços", "Novo Serviço"]);

const apiCall = async (method: string, path: string, body?: any) => {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(res.statusText);
  if (res.status === 204) return null;
  return res.json();
};

const STATUS_COLOR: Record<string, string> = {
  Planejada: "bg-blue-100 text-blue-700",
  Agendada: "bg-amber-100 text-amber-700",
  "Em Andamento": "bg-orange-100 text-orange-700",
  Concluída: "bg-emerald-100 text-emerald-700",
  Cancelada: "bg-red-100 text-red-700",
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function RegistroObra() {
  const { data: currentUser } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedWO, setSelectedWO] = useState<any>(null);
  const [serviceProgress, setServiceProgress] = useState<ServiceProgress[]>([]);
  const [selectedSvcIdx, setSelectedSvcIdx] = useState(0);
  const [consumoInputs, setConsumoInputs] = useState<Record<number, string>>({});
  const [consumoNotes, setConsumoNotes] = useState("");
  const [savingConsumo, setSavingConsumo] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  const { data: workOrders = [] } = useQuery({
    queryKey: ["/api/work-orders"],
    queryFn: () => apiCall("GET", "/api/work-orders"),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["/api/jobs"],
    queryFn: () => apiCall("GET", "/api/jobs"),
  });

  const { data: consumoLogs = [] } = useQuery({
    queryKey: ["/api/obra-consumo-logs", selectedWO?.id],
    queryFn: () =>
      selectedWO
        ? apiCall("GET", `/api/obra-consumo-logs?workOrderId=${selectedWO.id}`)
        : Promise.resolve([]),
    enabled: !!selectedWO,
  });

  const createConsumo = useMutation({
    mutationFn: (data: any) => apiCall("POST", "/api/obra-consumo-logs", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/obra-consumo-logs", selectedWO?.id] }),
  });

  const deleteConsumo = useMutation({
    mutationFn: (id: number) => apiCall("DELETE", `/api/obra-consumo-logs/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/obra-consumo-logs", selectedWO?.id] }),
  });

  const selectWO = (wo: any) => {
    setSelectedWO(wo);
    setShowSelector(false);
    setSelectedSvcIdx(0);
    setConsumoInputs({});
    setConsumoNotes("");

    const relatedJob = (jobs as any[]).find((j: any) => j.id === wo.jobId) || null;

    if (wo.serviceProgress) {
      try {
        const parsed: ServiceProgress[] = JSON.parse(wo.serviceProgress);
        const isGeneric = parsed.every(sp => GENERIC_NAMES.has(sp.serviceName));
        let hasRealJob = false;
        try {
          const jobSvcs = relatedJob?.serviceItems ? JSON.parse(relatedJob.serviceItems) : [];
          hasRealJob = jobSvcs.length > 0;
        } catch {}

        if (!isGeneric || !hasRealJob) {
          setServiceProgress(parsed.map(sp => ({
            ...sp,
            realMaterials: sp.realMaterials.map(m => ({
              ...m,
              plannedQty: ceilQty(m.plannedQty),
              realQty: m.realQty > 0 ? ceilQty(m.realQty) : 0,
            })),
          })));
          return;
        }
      } catch {}
    }

    setServiceProgress(buildProgressFromJob(wo, relatedJob));
  };

  const updateSP = (idx: number, field: keyof ServiceProgress, value: any) => {
    setServiceProgress(prev => prev.map((sp, i) => i === idx ? { ...sp, [field]: value } : sp));
  };

  const saveProgress = async () => {
    if (!selectedWO) return;
    setSavingProgress(true);
    try {
      await apiCall("PATCH", `/api/work-orders/${selectedWO.id}`, {
        serviceProgress: JSON.stringify(serviceProgress),
      });
      setSelectedWO((prev: any) => ({ ...prev, serviceProgress: JSON.stringify(serviceProgress) }));
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({ title: "Status dos serviços salvo!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSavingProgress(false);
    }
  };

  const handleRegistrar = async () => {
    if (!selectedWO) return;
    const sp = serviceProgress[selectedSvcIdx];
    if (!sp) return;

    const entries = sp.realMaterials
      .map((mat, idx) => ({ mat, qty: Math.ceil(Number(consumoInputs[idx] || 0)) }))
      .filter(e => e.qty > 0);

    if (entries.length === 0) {
      toast({ title: "Informe ao menos uma quantidade", variant: "destructive" });
      return;
    }

    setSavingConsumo(true);
    try {
      for (const e of entries) {
        await createConsumo.mutateAsync({
          workOrderId: selectedWO.id,
          serviceName: sp.serviceName,
          materialName: e.mat.name,
          inventoryId: e.mat.inventoryId || null,
          quantity: e.qty,
          notes: consumoNotes || null,
        });
      }
      setConsumoInputs({});
      setConsumoNotes("");
      toast({ title: `✅ ${entries.length} lançamento(s) registrado(s)!` });
    } catch {
      toast({ title: "Erro ao registrar", variant: "destructive" });
    } finally {
      setSavingConsumo(false);
    }
  };

  const activeWOs = (workOrders as any[]).filter(
    (wo: any) => !["Concluída", "Cancelada"].includes(wo.status)
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Registro de Obra</h1>
        <p className="text-slate-500 text-sm mt-1">
          Selecione uma obra ativa e registre o progresso e consumo de materiais
        </p>
      </div>

      {/* ── No OS selected ────────────────────────────────────────────────── */}
      {!selectedWO && (
        <div className="space-y-5">
          {/* Big CTA */}
          <button
            onClick={() => setShowSelector(true)}
            className="w-full py-10 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 active:scale-[0.99] transition-all flex flex-col items-center gap-4 group"
            data-testid="button-registrar-obra"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <ClipboardList className="w-10 h-10 text-white" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">Registrar Obra em Andamento</p>
              <p className="text-sm text-slate-500 mt-1">
                Clique para selecionar qual obra você está executando agora
              </p>
            </div>
          </button>

          {/* Quick list of active OSs */}
          {activeWOs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Obras disponíveis ({activeWOs.length})
              </p>
              <div className="space-y-2">
                {activeWOs.map((wo: any) => (
                  <button
                    key={wo.id}
                    onClick={() => selectWO(wo)}
                    className="w-full flex items-center justify-between bg-white border border-slate-200 hover:border-primary hover:shadow-md rounded-xl px-4 py-3.5 text-left transition-all group"
                    data-testid={`button-select-wo-${wo.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm">
                          OS #{wo.id} — {wo.clientName}
                        </p>
                        <p className="text-xs text-slate-500 truncate max-w-[250px]">
                          {wo.serviceType}
                        </p>
                        {wo.address && (
                          <p className="text-xs text-slate-400 truncate max-w-[250px]">{wo.address}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[wo.status] || "bg-slate-100 text-slate-600"}`}>
                        {wo.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeWOs.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">Nenhuma obra ativa no momento</p>
              <p className="text-xs text-slate-400 mt-1">
                Ordens de serviço com status "Concluída" ou "Cancelada" não aparecem aqui.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── OS Selector Modal ──────────────────────────────────────────────── */}
      {showSelector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowSelector(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-bold text-lg text-slate-800">Selecionar Obra</h2>
              <button
                onClick={() => setShowSelector(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              {activeWOs.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Nenhuma obra ativa no momento</p>
              ) : (
                activeWOs.map((wo: any) => (
                  <button
                    key={wo.id}
                    onClick={() => selectWO(wo)}
                    className="w-full flex items-center justify-between bg-slate-50 hover:bg-primary/5 border border-slate-200 hover:border-primary rounded-xl px-4 py-3.5 text-left transition-all"
                    data-testid={`selector-wo-${wo.id}`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm">
                        OS #{wo.id} — {wo.clientName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{wo.serviceType}</p>
                      {wo.address && (
                        <p className="text-xs text-slate-400 truncate">{wo.address}</p>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-3 ${STATUS_COLOR[wo.status] || "bg-slate-100 text-slate-600"}`}>
                      {wo.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Registration Interface ─────────────────────────────────────────── */}
      {selectedWO && (
        <div className="space-y-5">
          {/* Selected OS header bar */}
          <div className="flex items-center justify-between bg-primary text-white rounded-2xl px-5 py-4 shadow-lg">
            <div className="flex items-center gap-3 min-w-0">
              <Briefcase className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-lg leading-tight truncate">
                  OS #{selectedWO.id} — {selectedWO.clientName}
                </p>
                <p className="text-white/70 text-sm truncate">{selectedWO.serviceType}</p>
              </div>
            </div>
            <button
              onClick={() => { setSelectedWO(null); setServiceProgress([]); }}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shrink-0 ml-3"
              data-testid="button-trocar-os"
            >
              Trocar OS
            </button>
          </div>

          {/* Service status table */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              Serviços desta Obra
            </p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b">
                    <th className="px-4 py-2.5 text-left">Serviço</th>
                    <th className="px-4 py-2.5 text-center w-32">Status</th>
                    <th className="px-4 py-2.5 text-center w-36">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceProgress.map((sp, idx) => (
                    <tr key={idx} className={sp.finished ? "bg-emerald-50" : sp.started ? "bg-amber-50/60" : ""}>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{sp.serviceName}</td>
                      <td className="px-4 py-2.5 text-center">
                        {sp.finished ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Concluído
                          </span>
                        ) : sp.started ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                            <Clock className="w-3 h-3" /> Em andamento
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                            Não iniciado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {!sp.started && !sp.finished && (
                          <button
                            type="button"
                            onClick={() => {
                              updateSP(idx, "started", true);
                              if (!sp.startDate)
                                updateSP(idx, "startDate", new Date().toISOString().split("T")[0]);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
                            data-testid={`button-start-svc-${idx}`}
                          >
                            <Play className="w-3 h-3" /> Iniciar
                          </button>
                        )}
                        {sp.started && !sp.finished && (
                          <button
                            type="button"
                            onClick={() => {
                              updateSP(idx, "finished", true);
                              if (!sp.endDate)
                                updateSP(idx, "endDate", new Date().toISOString().split("T")[0]);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
                            data-testid={`button-finish-svc-${idx}`}
                          >
                            <CheckCircle className="w-3 h-3" /> Finalizar
                          </button>
                        )}
                        {sp.finished && (
                          <button
                            type="button"
                            onClick={() => {
                              updateSP(idx, "finished", false);
                              updateSP(idx, "started", true);
                            }}
                            className="text-xs font-semibold text-slate-400 hover:text-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                          >
                            ↩ Reabrir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={saveProgress}
                isLoading={savingProgress}
                data-testid="button-save-status"
              >
                Salvar status dos serviços
              </Button>
            </div>
          </div>

          {/* ── Lançar Consumo ──────────────────────────────────────────── */}
          <div className="border-2 border-primary/30 rounded-2xl bg-gradient-to-br from-primary/5 to-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-slate-800 text-base">Lançar Consumo de Material</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 border border-primary/20 text-primary font-bold px-3 py-1.5 rounded-full">
                <UserCheck className="w-3 h-3" /> {currentUser?.username}
              </span>
            </div>

            {/* Service selector pills */}
            {serviceProgress.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {serviceProgress.map((sp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setSelectedSvcIdx(i); setConsumoInputs({}); }}
                    data-testid={`pill-svc-${i}`}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                      selectedSvcIdx === i
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-white border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {sp.serviceName}
                  </button>
                ))}
              </div>
            )}

            {/* Materials for selected service */}
            {(serviceProgress[selectedSvcIdx]?.realMaterials.length ?? 0) > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Quantidades utilizadas
                  <span className="text-slate-400 font-normal normal-case tracking-normal">
                    — valores fracionados são arredondados para cima automaticamente
                  </span>
                </p>
                {serviceProgress[selectedSvcIdx].realMaterials.map((mat, matIdx) => (
                  <div
                    key={matIdx}
                    className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{mat.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Planejado: <span className="font-bold text-slate-600">{mat.plannedQty} un.</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={consumoInputs[matIdx] || ""}
                        onChange={e =>
                          setConsumoInputs(prev => ({ ...prev, [matIdx]: e.target.value }))
                        }
                        placeholder="0"
                        data-testid={`input-consumo-${matIdx}`}
                        className="w-24 text-center px-3 py-2.5 text-base rounded-xl border-2 border-slate-200 font-bold focus:outline-none focus:border-primary transition-all"
                      />
                      <span className="text-xs text-slate-400 w-6">un.</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 border border-slate-100 text-center">
                <Package className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">Nenhum material associado a este serviço.</p>
              </div>
            )}

            <input
              type="text"
              value={consumoNotes}
              onChange={e => setConsumoNotes(e.target.value)}
              placeholder="Observações sobre o consumo (opcional)"
              data-testid="input-consumo-notes"
              className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-primary transition-all"
            />

            <Button
              type="button"
              onClick={handleRegistrar}
              isLoading={savingConsumo}
              className="w-full py-3 text-base"
              data-testid="button-registrar-consumo"
            >
              <ClipboardList className="w-5 h-5 mr-2" />
              Registrar Consumo
            </Button>
          </div>

          {/* ── History ───────────────────────────────────────────────────── */}
          {(consumoLogs as any[]).length > 0 && (
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Histórico de Lançamentos ({(consumoLogs as any[]).length})
              </p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b">
                      <th className="px-3 py-2.5 text-left">Data/Hora</th>
                      <th className="px-3 py-2.5 text-left">Usuário</th>
                      <th className="px-3 py-2.5 text-left">Serviço</th>
                      <th className="px-3 py-2.5 text-left">Material</th>
                      <th className="px-3 py-2.5 text-center w-16">Qtd</th>
                      <th className="px-3 py-2.5 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(consumoLogs as any[]).map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                          {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-primary text-xs">{log.username}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[90px] truncate">
                          {log.serviceName}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-700 max-w-[110px] truncate">
                          {log.materialName}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-800 text-sm">
                          {log.quantity}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => deleteConsumo.mutate(log.id)}
                            data-testid={`button-delete-log-${log.id}`}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
