import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Trash2, Edit2, BarChart3, Clock, Ruler } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { asArray } from "@/lib/safeData";

type ProductionLog = {
  id: number;
  workOrderId?: number;
  jobId?: number;
  clientName?: string;
  technicianName: string;
  userId?: number;
  date: string;
  hoursWorked?: number;
  squareMeters?: number;
  serviceType?: string;
  notes?: string;
  createdAt: string;
};

type JobOption = { id: number; clientName: string; serviceType: string; orcamentoNumero?: number | null; squareMeters?: number | null };
type UserOption = { id: number; fullName?: string | null; username: string };

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

type ProductivityTarget = { id: number; label: string; serviceType?: string | null; targetValue: number; unit: string; active: boolean };

export default function TeamProductivity() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: logs = [], isLoading } = useQuery<ProductionLog[]>({ queryKey: ["/api/production-logs"] });
  const { data: targets = [] } = useQuery<ProductivityTarget[]>({ queryKey: ["/api/productivity-targets"] });
  const { data: jobs = [] } = useQuery<JobOption[]>({ queryKey: ["/api/jobs"] });
  const { data: users = [] } = useQuery<UserOption[]>({ queryKey: ["/api/users"] });
  const { data: services = [] } = useQuery<{ id: number; name: string }[]>({ queryKey: ["/api/services"] });
  const logsList = asArray<ProductionLog>(logs);
  const targetsList = asArray<ProductivityTarget>(targets).filter(t => t.active);
  const jobsList = asArray<JobOption>(jobs).sort((a, b) => (b.orcamentoNumero ?? b.id) - (a.orcamentoNumero ?? a.id));
  const usersList = asArray<UserOption>(users);
  const servicesList = asArray<{ id: number; name: string }>(services);

  const [tab, setTab]   = useState<"registros" | "resumo">("registros");
  const [isModal, setModal] = useState(false);
  const [editing, setEditing] = useState<ProductionLog | null>(null);

  const [form, setForm] = useState({
    technicianName: "",
    userId: "",
    clientName: "",
    jobId: "",
    serviceType: "",
    date: new Date().toISOString().split("T")[0],
    hoursWorked: "",
    squareMeters: "",
    notes: "",
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/production-logs"] });

  const create = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/production-logs", d),
    onSuccess: () => { invalidate(); toast({ title: "Registro criado!" }); closeModal(); },
    onError: (e: any) => toast({ title: `Erro: ${e.message}`, variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: ({ id, ...d }: any) => apiRequest("PUT", `/api/production-logs/${id}`, d),
    onSuccess: () => { invalidate(); toast({ title: "Atualizado!" }); closeModal(); },
    onError: (e: any) => toast({ title: `Erro: ${e.message}`, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/production-logs/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Removido." }); },
  });

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm({ technicianName: "", userId: "", clientName: "", jobId: "", serviceType: "", date: new Date().toISOString().split("T")[0], hoursWorked: "", squareMeters: "", notes: "" });
    setModal(true);
  };
  const openEdit = (log: ProductionLog) => {
    setEditing(log);
    setForm({
      technicianName: log.technicianName,
      userId: log.userId ? String(log.userId) : "",
      clientName: log.clientName || "",
      jobId: log.jobId ? String(log.jobId) : "",
      serviceType: log.serviceType || "",
      date: log.date,
      hoursWorked: log.hoursWorked ? String(log.hoursWorked) : "",
      squareMeters: log.squareMeters ? String(log.squareMeters) : "",
      notes: log.notes || "",
    });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); };

  // Selecionar a obra já preenche cliente/serviço/m² a partir do orçamento real — antes era
  // tudo texto livre, sem nenhuma ligação com o que já está cadastrado no sistema.
  const handleJobSelect = (jobId: string) => {
    const job = jobsList.find(j => String(j.id) === jobId);
    setForm(f => ({
      ...f,
      jobId,
      clientName: job?.clientName || f.clientName,
      serviceType: job?.serviceType || f.serviceType,
      squareMeters: job?.squareMeters ? String(job.squareMeters) : f.squareMeters,
    }));
  };
  const handleTechnicianSelect = (userId: string) => {
    const user = usersList.find(u => String(u.id) === userId);
    setForm(f => ({ ...f, userId, technicianName: user ? (user.fullName || user.username) : f.technicianName }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      userId: form.userId ? Number(form.userId) : undefined,
      jobId: form.jobId ? Number(form.jobId) : undefined,
      hoursWorked: form.hoursWorked ? Number(form.hoursWorked) : 0,
      squareMeters: form.squareMeters ? Number(form.squareMeters) : 0,
    };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  };

  // ─── Summary per technician ───────────────────────────────────────────────
  type TechSummary = { hours: number; m2: number; days: Set<string>; services: Set<string>; count: number; byDay: Record<string, { m2: number; hours: number }> };
  const summary: Record<string, TechSummary> = {};
  logsList.forEach(log => {
    if (!summary[log.technicianName]) {
      summary[log.technicianName] = { hours: 0, m2: 0, days: new Set(), services: new Set(), count: 0, byDay: {} };
    }
    summary[log.technicianName].hours += log.hoursWorked || 0;
    summary[log.technicianName].m2    += log.squareMeters || 0;
    summary[log.technicianName].days.add(log.date);
    if (log.serviceType) summary[log.technicianName].services.add(log.serviceType);
    summary[log.technicianName].count++;
    const day = summary[log.technicianName].byDay[log.date] || { m2: 0, hours: 0 };
    day.m2 += log.squareMeters || 0;
    day.hours += log.hoursWorked || 0;
    summary[log.technicianName].byDay[log.date] = day;
  });

  const techList = Object.entries(summary).sort((a, b) => b[1].m2 - a[1].m2);
  const targetForServices = (services: Set<string>) => targetsList.find(t => t.serviceType && services.has(t.serviceType));
  // A meta pode ser por dia ou por hora — compara com a métrica certa em vez de misturar unidades.
  const actualForTarget = (data: TechSummary, target: ProductivityTarget) => {
    if (target.unit.toLowerCase().includes("dia")) return data.days.size > 0 ? data.m2 / data.days.size : null;
    return data.hours > 0 ? data.m2 / data.hours : null;
  };
  const totalM2    = logsList.reduce((s, l) => s + (l.squareMeters || 0), 0);
  const totalHours = logsList.reduce((s, l) => s + (l.hoursWorked || 0), 0);
  const avgM2h     = totalHours > 0 ? (totalM2 / totalHours).toFixed(2) : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Controle de Equipe e Produtividade
          </h1>
          <p className="text-slate-500 mt-1">Ficha de produção por obra, controle de horas e produtividade por técnico.</p>
        </div>
        <Button onClick={openNew} data-testid="button-new-production-log">
          <Plus className="w-4 h-4 mr-2" /> Novo Registro
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total m² Executados", value: `${totalM2.toFixed(1)} m²`, icon: Ruler, bg: "bg-blue-50",   color: "text-primary" },
          { label: "Total de Horas",      value: `${totalHours.toFixed(1)}h`, icon: Clock, bg: "bg-amber-50", color: "text-amber-700" },
          { label: "Produtividade Média", value: `${avgM2h} m²/h`,            icon: BarChart3, bg: "bg-green-50", color: "text-green-700" },
          { label: "Total de Técnicos",   value: String(techList.length),     icon: Users, bg: "bg-slate-50", color: "text-slate-700" },
        ].map(k => (
          <Card key={k.label} className={`${k.bg} border-0 p-4`}>
            <k.icon className={`w-6 h-6 ${k.color} mb-2`} />
            <p className="text-xl font-bold text-slate-900">{k.value}</p>
            <p className={`text-xs font-semibold ${k.color}`}>{k.label}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[{ id: "registros", label: "Registros" }, { id: "resumo", label: "Resumo por Técnico" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "registros" && (
        <Card>
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : logsList.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum registro de produção ainda</p>
              <p className="text-sm mt-1">Clique em "Novo Registro" para adicionar a ficha de produção de uma obra.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logsList.map(log => (
                <div key={log.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors" data-testid={`row-prodlog-${log.id}`}>
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm">{log.technicianName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{log.technicianName}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                      <span>{fmtDate(log.date)}</span>
                      {log.clientName && <span>· {log.clientName}</span>}
                      {log.serviceType && <span>· {log.serviceType}</span>}
                    </div>
                  </div>
                  <div className="flex gap-4 shrink-0">
                    {log.squareMeters != null && log.squareMeters > 0 && (
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary">{log.squareMeters}</p>
                        <p className="text-xs text-slate-400">m²</p>
                      </div>
                    )}
                    {log.hoursWorked != null && log.hoursWorked > 0 && (
                      <div className="text-center">
                        <p className="text-lg font-bold text-amber-600">{log.hoursWorked}h</p>
                        <p className="text-xs text-slate-400">horas</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(log)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => !confirm(`Excluir este registro?`) || remove.mutate(log.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "resumo" && (
        <Card>
          {techList.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum dado de produção disponível</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {techList.map(([name, data]) => {
                const m2h = data.hours > 0 ? data.m2 / data.hours : null;
                const target = targetForServices(data.services);
                const actual = target ? actualForTarget(data, target) : null;
                const aboveTarget = target && actual != null ? actual >= target.targetValue : null;
                return (
                  <div key={name} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold text-lg">{name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{name}</p>
                        <p className="text-xs text-slate-400">{data.days.size} dia(s) trabalhado(s) · {data.count} registro(s)</p>
                        <StreakGrid byDay={data.byDay} target={target} actualForDay={(day) => target?.unit.toLowerCase().includes("dia") ? day.m2 : (day.hours > 0 ? day.m2 / day.hours : null)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <p className="text-xl font-bold text-primary">{data.m2.toFixed(1)}</p>
                        <p className="text-xs text-slate-400 font-medium">m² total</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-amber-600">{data.hours.toFixed(1)}h</p>
                        <p className="text-xs text-slate-400 font-medium">horas</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-green-600">{m2h != null ? m2h.toFixed(2) : "—"}</p>
                        <p className="text-xs text-slate-400 font-medium">m²/h</p>
                        {target && actual != null && (
                          <p className={`mt-0.5 text-[11px] font-semibold ${aboveTarget ? "text-green-600" : "text-red-600"}`}>
                            {aboveTarget ? "Acima da meta" : "Abaixo da meta"}: {actual.toFixed(1)}/{target.targetValue} {target.unit}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Modal isOpen={isModal} onClose={closeModal} title={editing ? "Editar Registro" : "Novo Registro de Produção"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-1">Obra / Orçamento</label>
              <select value={form.jobId} onChange={e => handleJobSelect(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50" data-testid="select-prod-job">
                <option value="">— Selecionar da base de dados (opcional) —</option>
                {jobsList.map(job => (
                  <option key={job.id} value={job.id}>
                    #{String(job.orcamentoNumero ?? job.id).padStart(4, "0")} — {job.clientName} — {job.serviceType}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">Selecionar preenche cliente, serviço e m² automaticamente — ainda dá pra ajustar os campos depois.</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-1">Técnico *</label>
              <select value={form.userId} onChange={e => handleTechnicianSelect(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 mb-2" data-testid="select-prod-technician">
                <option value="">— Selecionar da equipe (opcional) —</option>
                {usersList.map(user => (
                  <option key={user.id} value={user.id}>{user.fullName || user.username}</option>
                ))}
              </select>
              <input value={form.technicianName} onChange={e => setField("technicianName", e.target.value)} required
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="Nome do técnico (ou digite se não estiver na lista)" data-testid="input-prod-technician" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Data *</label>
              <input type="date" value={form.date} onChange={e => setField("date", e.target.value)} required
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50" data-testid="input-prod-date" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Tipo de Serviço</label>
              <input value={form.serviceType} onChange={e => setField("serviceType", e.target.value)} list="prod-service-options"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="Selecione a obra acima ou digite" />
              <datalist id="prod-service-options">
                {servicesList.map(s => <option key={s.id} value={s.name} />)}
              </datalist>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Cliente / Obra</label>
              <input value={form.clientName} onChange={e => setField("clientName", e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="Preenchido ao selecionar a obra, ou digite" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">m² Executados</label>
              <input type="number" value={form.squareMeters} onChange={e => setField("squareMeters", e.target.value)} min={0} step={0.1}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="0.0" data-testid="input-prod-m2" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Horas Trabalhadas</label>
              <input type="number" value={form.hoursWorked} onChange={e => setField("hoursWorked", e.target.value)} min={0} step={0.5}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="0.0" data-testid="input-prod-hours" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-1">Observações</label>
              <textarea value={form.notes} onChange={e => setField("notes", e.target.value)} rows={2}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" isLoading={create.isPending || update.isPending} className="flex-1" data-testid="button-save-prodlog">
              {editing ? "Salvar" : "Registrar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Mapa de streak (tipo "quadradinhos" de hábito): um quadrado por dia dos últimos 60 dias,
// colorido conforme bateu ou não a meta aplicável naquele dia.
function StreakGrid({
  byDay,
  target,
  actualForDay,
}: {
  byDay: Record<string, { m2: number; hours: number }>;
  target?: ProductivityTarget;
  actualForDay: (day: { m2: number; hours: number }) => number | null;
}) {
  const days: { date: string; state: "empty" | "miss" | "hit" }[] = [];
  const today = new Date();
  for (let i = 59; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const day = byDay[key];
    if (!day) { days.push({ date: key, state: "empty" }); continue; }
    if (!target) { days.push({ date: key, state: "hit" }); continue; }
    const actual = actualForDay(day);
    days.push({ date: key, state: actual != null && actual >= target.targetValue ? "hit" : "miss" });
  }

  const colorFor = (state: "empty" | "miss" | "hit") =>
    state === "hit" ? "bg-green-500" : state === "miss" ? "bg-amber-400" : "bg-slate-100";

  return (
    <div className="mt-2 flex flex-wrap gap-0.5" title="Últimos 60 dias">
      {days.map(day => (
        <div key={day.date} className={`h-2.5 w-2.5 rounded-sm ${colorFor(day.state)}`} title={`${day.date}${day.state === "empty" ? " — sem registro" : day.state === "hit" ? " — bateu a meta" : " — abaixo da meta"}`} />
      ))}
    </div>
  );
}
