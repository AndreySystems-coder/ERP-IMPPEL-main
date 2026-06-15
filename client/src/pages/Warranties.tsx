import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Plus, AlertTriangle, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Trash2, Wrench } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { asArray } from "@/lib/safeData";

type Warranty = {
  id: number;
  workOrderId?: number;
  jobId?: number;
  clientName: string;
  clientPhone?: string;
  serviceType: string;
  warrantyMonths: number;
  startDate: string;
  endDate: string;
  status: string;
  notes?: string;
  createdAt: string;
};

type WarrantyIncident = {
  id: number;
  warrantyId: number;
  description: string;
  cost?: number;
  technicianName?: string;
  resolvedAt?: string;
  status: string;
  notes?: string;
  createdAt: string;
};

const fmtBRL  = (v?: number | null) => v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00";
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

function daysLeft(endDate: string): number {
  const end  = new Date(endDate);
  const now  = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  ativa:     { label: "Ativa",     color: "bg-green-100 text-green-700 border-green-200",   icon: CheckCircle },
  vencida:   { label: "Vencida",   color: "bg-slate-100 text-slate-500 border-slate-200",   icon: Clock },
  acionada:  { label: "Acionada",  color: "bg-amber-100 text-amber-700 border-amber-200",   icon: AlertTriangle },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700 border-red-200",          icon: XCircle },
};

export default function Warranties() {
  const { data: currentUser } = useUser();
  const isAdmin = currentUser?.role === "admin";
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: warranties = [], isLoading } = useQuery<Warranty[]>({ queryKey: ["/api/warranties"] });
  const warrantiesList = asArray<Warranty>(warranties);

  const [tab, setTab]             = useState<"garantias" | "ocorrencias">("garantias");
  const [statusFilter, setFilter] = useState("todos");
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [isModalOpen, setModal]   = useState(false);
  const [isIncModal, setIncModal] = useState(false);
  const [selWarranty, setSelWarranty] = useState<Warranty | null>(null);

  // Warranty form
  const [form, setForm] = useState({ clientName: "", clientPhone: "", serviceType: "", warrantyMonths: "12", startDate: "", endDate: "", status: "ativa", notes: "" });

  // Incident form
  const [incForm, setIncForm] = useState({ description: "", cost: "", technicianName: "", resolvedAt: "", status: "aberta", notes: "" });

  const { data: incidents = [] } = useQuery<WarrantyIncident[]>({
    queryKey: ["/api/warranty-incidents", expanded],
    enabled: expanded != null,
    queryFn: () => fetch(`/api/warranty-incidents?warrantyId=${expanded}`).then(r => r.json()),
  });
  const incidentsList = asArray<WarrantyIncident>(incidents);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/warranties"] });
  const invalidateInc = () => qc.invalidateQueries({ queryKey: ["/api/warranty-incidents", expanded] });

  const create = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/warranties", d),
    onSuccess: () => { invalidate(); toast({ title: "Garantia registrada!" }); setModal(false); },
    onError: (e: any) => toast({ title: `Erro: ${e.message}`, variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: ({ id, ...d }: any) => apiRequest("PUT", `/api/warranties/${id}`, d),
    onSuccess: () => { invalidate(); toast({ title: "Atualizado!" }); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/warranties/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Removida." }); },
  });

  const createInc = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/warranty-incidents", d),
    onSuccess: () => {
      invalidateInc();
      // mark warranty as "acionada"
      if (expanded != null) update.mutate({ id: expanded, status: "acionada" });
      toast({ title: "Ocorrência registrada!" });
      setIncModal(false);
    },
    onError: (e: any) => toast({ title: `Erro: ${e.message}`, variant: "destructive" }),
  });
  const removeInc = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/warranty-incidents/${id}`),
    onSuccess: () => { invalidateInc(); toast({ title: "Ocorrência removida." }); },
  });

  const setFormField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setIncField  = (k: string, v: string) => setIncForm(f => ({ ...f, [k]: v }));

  const openNew = () => {
    const today = new Date().toISOString().split("T")[0];
    const end   = new Date(); end.setMonth(end.getMonth() + 12);
    setForm({ clientName: "", clientPhone: "", serviceType: "", warrantyMonths: "12", startDate: today, endDate: end.toISOString().split("T")[0], status: "ativa", notes: "" });
    setModal(true);
  };

  const computeEndDate = (start: string, months: number) => {
    if (!start) return "";
    const d = new Date(start);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split("T")[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({ ...form, warrantyMonths: Number(form.warrantyMonths) });
  };

  const handleIncSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expanded) return;
    createInc.mutate({ ...incForm, warrantyId: expanded, cost: incForm.cost ? Number(incForm.cost) : 0 });
  };

  const filtered = warrantiesList.filter(w => statusFilter === "todos" || w.status === statusFilter);

  // All incidents for the "Ocorrências" tab
  const { data: allIncidents = [] } = useQuery<WarrantyIncident[]>({
    queryKey: ["/api/warranty-incidents", "all"],
    queryFn: () =>
      Promise.all(warrantiesList.map(w => fetch(`/api/warranty-incidents?warrantyId=${w.id}`).then(r => r.json())))
        .then(results => results.flat()),
    enabled: tab === "ocorrencias" && warrantiesList.length > 0,
  });
  const allIncidentsList = asArray<WarrantyIncident>(allIncidents);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Garantias
          </h1>
          <p className="text-slate-500 mt-1">Controle de garantias ativas, vencimentos e ocorrências registradas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNew} data-testid="button-new-warranty">
            <Plus className="w-4 h-4 mr-2" /> Nova Garantia
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { s: "ativa",     label: "Ativas",     bg: "bg-green-50", txt: "text-green-700" },
          { s: "vencida",   label: "Vencidas",   bg: "bg-slate-50", txt: "text-slate-600" },
          { s: "acionada",  label: "Acionadas",  bg: "bg-amber-50", txt: "text-amber-700" },
          { s: "cancelada", label: "Canceladas", bg: "bg-red-50",   txt: "text-red-700"   },
        ].map(k => (
          <Card key={k.s} className={`${k.bg} border-0 p-4 text-center`}>
            <p className="text-2xl font-bold">{warrantiesList.filter(w => w.status === k.s).length}</p>
            <p className={`text-sm font-medium ${k.txt}`}>{k.label}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(["garantias","ocorrencias"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
            {t === "garantias" ? "Garantias" : "Ocorrências"}
          </button>
        ))}
      </div>

      {tab === "garantias" && (
        <>
          <div className="flex gap-2 flex-wrap">
            {["todos","ativa","vencida","acionada","cancelada"].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors capitalize ${statusFilter === s ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-primary"}`}>
                {s === "todos" ? "Todas" : STATUS_MAP[s]?.label}
              </button>
            ))}
          </div>

          <Card>
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14 text-slate-400">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma garantia encontrada</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map(w => {
                  const st   = STATUS_MAP[w.status] || STATUS_MAP.ativa;
                  const days = daysLeft(w.endDate);
                  const isEx = expanded === w.id;
                  return (
                    <div key={w.id} data-testid={`row-warranty-${w.id}`}>
                      <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="font-semibold text-slate-800">{w.clientName}</span>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${st.color}`}>
                              <st.icon className="w-3 h-3" />{st.label}
                            </span>
                            {w.status === "ativa" && (
                              <span className={`text-xs font-semibold ${days <= 30 ? "text-amber-600" : "text-slate-400"}`}>
                                {days > 0 ? `${days} dias restantes` : "Expirada hoje"}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{w.serviceType} · {w.warrantyMonths} meses · {fmtDate(w.startDate)} até {fmtDate(w.endDate)}</p>
                          {w.clientPhone && <p className="text-xs text-slate-400">{w.clientPhone}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setSelWarranty(w); setIncModal(true); }}
                            className="px-2 py-1 text-xs rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 font-medium" title="Registrar ocorrência">
                            <Wrench className="w-3 h-3 inline mr-1" />Ocorrência
                          </button>
                          <select value={w.status} onChange={e => update.mutate({ id: w.id, status: e.target.value })}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600">
                            {Object.entries(STATUS_MAP).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                          </select>
                          <button onClick={() => !confirm(`Excluir garantia de "${w.clientName}"?`) || remove.mutate(w.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setExpanded(isEx ? null : w.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                            {isEx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {isEx && (
                        <div className="px-6 pb-4 bg-slate-50 border-t border-slate-100">
                          <p className="text-xs font-bold text-slate-400 uppercase mt-3 mb-2">Ocorrências desta garantia</p>
                          {incidentsList.length === 0 ? (
                            <p className="text-sm text-slate-400">Nenhuma ocorrência registrada.</p>
                          ) : (
                            <div className="space-y-2">
                              {incidentsList.map(inc => (
                                <div key={inc.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-700">{inc.description}</p>
                                    <p className="text-xs text-slate-500">{inc.technicianName ? `Técnico: ${inc.technicianName}` : ""} {inc.cost ? `· Custo: ${fmtBRL(inc.cost)}` : ""}</p>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inc.status === "resolvida" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{inc.status === "resolvida" ? "Resolvida" : "Aberta"}</span>
                                  </div>
                                  <button onClick={() => removeInc.mutate(inc.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === "ocorrencias" && (
        <Card>
          {allIncidentsList.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma ocorrência registrada</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {allIncidentsList.map(inc => {
                const warranty = warrantiesList.find(w => w.id === inc.warrantyId);
                return (
                  <div key={inc.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{warranty?.clientName || "—"}</p>
                      <p className="text-sm text-slate-600 mt-0.5">{inc.description}</p>
                      <div className="flex gap-4 text-xs text-slate-400 mt-1">
                        {inc.technicianName && <span>Técnico: {inc.technicianName}</span>}
                        {inc.cost ? <span>Custo: {fmtBRL(inc.cost)}</span> : null}
                        <span>{fmtDate(inc.createdAt)}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${inc.status === "resolvida" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {inc.status === "resolvida" ? "Resolvida" : "Aberta"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* New Warranty Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setModal(false)} title="Nova Garantia">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-1">Nome do Cliente *</label>
              <input value={form.clientName} onChange={e => setFormField("clientName", e.target.value)} required
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="Nome do cliente" data-testid="input-warranty-client" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Telefone</label>
              <input value={form.clientPhone} onChange={e => setFormField("clientPhone", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Meses de Garantia</label>
              <input type="number" value={form.warrantyMonths} onChange={e => {
                setFormField("warrantyMonths", e.target.value);
                if (form.startDate) setFormField("endDate", computeEndDate(form.startDate, Number(e.target.value)));
              }} min={1}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-1">Tipo de Serviço *</label>
              <input value={form.serviceType} onChange={e => setFormField("serviceType", e.target.value)} required
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="Ex: Manta Asfáltica" data-testid="input-warranty-service" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Data de Início *</label>
              <input type="date" value={form.startDate} onChange={e => {
                setFormField("startDate", e.target.value);
                setFormField("endDate", computeEndDate(e.target.value, Number(form.warrantyMonths)));
              }} required className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Data de Vencimento</label>
              <input type="date" value={form.endDate} onChange={e => setFormField("endDate", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-1">Observações</label>
              <textarea value={form.notes} onChange={e => setFormField("notes", e.target.value)} rows={2}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={create.isPending} className="flex-1" data-testid="button-save-warranty">Registrar</Button>
          </div>
        </form>
      </Modal>

      {/* Incident Modal */}
      <Modal isOpen={isIncModal} onClose={() => setIncModal(false)} title={`Ocorrência — ${selWarranty?.clientName || ""}`}>
        <form onSubmit={e => { e.preventDefault(); if (selWarranty) { setExpanded(selWarranty.id); createInc.mutate({ ...incForm, warrantyId: selWarranty.id, cost: incForm.cost ? Number(incForm.cost) : 0 }); } }} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">Descrição do Problema *</label>
            <textarea value={incForm.description} onChange={e => setIncField("description", e.target.value)} required rows={3}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 resize-none"
              placeholder="Descreva o problema reportado pelo cliente..." data-testid="input-incident-desc" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Custo (R$)</label>
              <input type="number" value={incForm.cost} onChange={e => setIncField("cost", e.target.value)} min={0}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50" placeholder="0,00" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Técnico Responsável</label>
              <input value={incForm.technicianName} onChange={e => setIncField("technicianName", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setIncModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={createInc.isPending} className="flex-1" data-testid="button-save-incident">Registrar Ocorrência</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
