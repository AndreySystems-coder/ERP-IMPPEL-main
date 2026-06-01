import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Plus, Star, Bell, CheckCircle, Clock, MessageSquare, Trash2, Edit2, Send } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type NpsResponse = {
  id: number;
  workOrderId?: number;
  jobId?: number;
  clientName: string;
  clientPhone?: string;
  sentAt?: string;
  respondedAt?: string;
  score?: number;
  comment?: string;
  status: string;
  createdAt: string;
};

type MaintenanceReminder = {
  id: number;
  workOrderId?: number;
  jobId?: number;
  clientName: string;
  clientPhone?: string;
  serviceType?: string;
  completedDate: string;
  reminder12SentAt?: string;
  reminder24SentAt?: string;
  notes?: string;
  createdAt: string;
};

const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

function npsCategory(score?: number | null): { label: string; color: string } {
  if (score == null) return { label: "—", color: "text-slate-400" };
  if (score >= 9)  return { label: "Promotor", color: "text-green-600" };
  if (score >= 7)  return { label: "Neutro",   color: "text-amber-600" };
  return               { label: "Detrator",  color: "text-red-600" };
}

function npsScoreColor(score?: number | null): string {
  if (score == null) return "bg-slate-100 text-slate-400";
  if (score >= 9)  return "bg-green-100 text-green-700";
  if (score >= 7)  return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function daysAgo(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function nextReminderDays(completedDate: string, reminder12?: string | null, reminder24?: string | null): { next12: number; next24: number } {
  const completed = new Date(completedDate);
  const now = new Date();
  const d12 = new Date(completed); d12.setMonth(d12.getMonth() + 12);
  const d24 = new Date(completed); d24.setMonth(d24.getMonth() + 24);
  return {
    next12: reminder12 ? -1 : Math.ceil((d12.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    next24: reminder24 ? -1 : Math.ceil((d24.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  };
}

function whatsappLink(phone?: string | null, message?: string): string {
  if (!phone) return "#";
  const clean = phone.replace(/\D/g, "");
  const br    = clean.startsWith("55") ? clean : `55${clean}`;
  const text  = encodeURIComponent(message || "");
  return `https://wa.me/${br}?text=${text}`;
}

export default function PostSale() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: npsData = [], isLoading: npsLoading } = useQuery<NpsResponse[]>({ queryKey: ["/api/nps-responses"] });
  const { data: reminders = [], isLoading: remLoading } = useQuery<MaintenanceReminder[]>({ queryKey: ["/api/maintenance-reminders"] });

  const [tab, setTab] = useState<"nps" | "lembretes">("nps");

  // NPS state
  const [isNpsModal, setNpsModal] = useState(false);
  const [isReplyModal, setReplyModal] = useState(false);
  const [selNps, setSelNps] = useState<NpsResponse | null>(null);
  const [npsForm, setNpsForm] = useState({ clientName: "", clientPhone: "", score: "", comment: "" });
  const [replyForm, setReplyForm] = useState({ score: "", comment: "" });

  // Reminder state
  const [isRemModal, setRemModal] = useState(false);
  const [remForm, setRemForm] = useState({ clientName: "", clientPhone: "", serviceType: "", completedDate: "", notes: "" });

  const invNps = () => qc.invalidateQueries({ queryKey: ["/api/nps-responses"] });
  const invRem = () => qc.invalidateQueries({ queryKey: ["/api/maintenance-reminders"] });

  const createNps = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/nps-responses", d),
    onSuccess: () => { invNps(); toast({ title: "Pesquisa registrada!" }); setNpsModal(false); },
    onError: (e: any) => toast({ title: `Erro: ${e.message}`, variant: "destructive" }),
  });
  const updateNps = useMutation({
    mutationFn: ({ id, ...d }: any) => apiRequest("PUT", `/api/nps-responses/${id}`, d),
    onSuccess: () => { invNps(); toast({ title: "Resposta registrada!" }); setReplyModal(false); },
    onError: (e: any) => toast({ title: `Erro: ${e.message}`, variant: "destructive" }),
  });
  const removeNps = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/nps-responses/${id}`),
    onSuccess: () => { invNps(); toast({ title: "Removido." }); },
  });

  const createRem = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/maintenance-reminders", d),
    onSuccess: () => { invRem(); toast({ title: "Lembrete criado!" }); setRemModal(false); },
    onError: (e: any) => toast({ title: `Erro: ${e.message}`, variant: "destructive" }),
  });
  const markRem = useMutation({
    mutationFn: ({ id, field }: { id: number; field: "12" | "24" }) =>
      apiRequest("PUT", `/api/maintenance-reminders/${id}`, field === "12" ? { reminder12SentAt: new Date().toISOString() } : { reminder24SentAt: new Date().toISOString() }),
    onSuccess: () => { invRem(); toast({ title: "Lembrete marcado como enviado!" }); },
  });
  const removeRem = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/maintenance-reminders/${id}`),
    onSuccess: () => { invRem(); toast({ title: "Removido." }); },
  });

  // NPS stats
  const responded = (npsData as NpsResponse[]).filter(n => n.status === "respondido" && n.score != null);
  const avgNps    = responded.length > 0 ? (responded.reduce((s, n) => s + (n.score || 0), 0) / responded.length).toFixed(1) : "—";
  const promotors = responded.filter(n => (n.score || 0) >= 9).length;
  const neutros   = responded.filter(n => (n.score || 0) >= 7 && (n.score || 0) < 9).length;
  const detrators = responded.filter(n => (n.score || 0) < 7).length;

  // Upcoming reminders
  const upcomingRem = (reminders as MaintenanceReminder[]).filter(r => {
    const { next12, next24 } = nextReminderDays(r.completedDate, r.reminder12SentAt, r.reminder24SentAt);
    return (next12 > 0 && next12 <= 30) || (next24 > 0 && next24 <= 30);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
          <Heart className="w-8 h-8 text-primary" />
          Pós-Venda e NPS
        </h1>
        <p className="text-slate-500 mt-1">Pesquisa de satisfação (NPS) e lembretes de manutenção preventiva.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[{ id: "nps", label: "NPS / Satisfação" }, { id: "lembretes", label: "Lembretes de Manutenção" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── NPS TAB ──────────────────────────────────────────────────────── */}
      {tab === "nps" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => { setNpsForm({ clientName: "", clientPhone: "", score: "", comment: "" }); setNpsModal(true); }} data-testid="button-new-nps">
              <Plus className="w-4 h-4 mr-2" /> Nova Pesquisa
            </Button>
          </div>

          {/* NPS stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Nota Média", value: avgNps, color: "text-primary",   bg: "bg-blue-50", icon: Star },
              { label: "Promotores (9-10)", value: String(promotors), color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
              { label: "Neutros (7-8)",     value: String(neutros),   color: "text-amber-600", bg: "bg-amber-50", icon: Star },
              { label: "Detratores (0-6)",  value: String(detrators), color: "text-red-600",   bg: "bg-red-50",   icon: MessageSquare },
            ].map(k => (
              <Card key={k.label} className={`${k.bg} border-0 p-4`}>
                <k.icon className={`w-5 h-5 ${k.color} mb-2`} />
                <p className="text-2xl font-bold text-slate-900">{k.value}</p>
                <p className={`text-xs font-semibold ${k.color}`}>{k.label}</p>
              </Card>
            ))}
          </div>

          <Card>
            {npsLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            ) : (npsData as NpsResponse[]).length === 0 ? (
              <div className="text-center py-14 text-slate-400">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma pesquisa de satisfação registrada</p>
                <p className="text-sm mt-1">Registre pesquisas NPS para monitorar a satisfação dos seus clientes.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(npsData as NpsResponse[]).map(n => {
                  const cat = npsCategory(n.score);
                  return (
                    <div key={n.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors" data-testid={`row-nps-${n.id}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${npsScoreColor(n.score)}`}>
                        {n.score ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-slate-800">{n.clientName}</span>
                          {n.status === "respondido" ? (
                            <span className={`text-xs font-semibold ${cat.color}`}>{cat.label}</span>
                          ) : (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Pendente</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">Enviado: {fmtDate(n.sentAt || n.createdAt)} {n.respondedAt ? `· Respondido: ${fmtDate(n.respondedAt)}` : `· Há ${daysAgo(n.sentAt || n.createdAt)} dias`}</p>
                        {n.comment && <p className="text-sm text-slate-600 italic mt-1">"{n.comment}"</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {n.clientPhone && (
                          <a href={whatsappLink(n.clientPhone, `Olá ${n.clientName}! Como foi sua experiência com a IMPPEL? De 0 a 10, qual nota você daria para os nossos serviços?`)}
                            target="_blank" rel="noreferrer"
                            className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg" title="Enviar via WhatsApp">
                            <Send className="w-4 h-4" />
                          </a>
                        )}
                        {n.status === "pendente" && (
                          <button onClick={() => { setSelNps(n); setReplyForm({ score: "", comment: "" }); setReplyModal(true); }}
                            className="px-2 py-1 text-xs rounded-lg border border-primary text-primary hover:bg-primary/10 font-medium">
                            Registrar Resposta
                          </button>
                        )}
                        <button onClick={() => !confirm(`Excluir esta pesquisa?`) || removeNps.mutate(n.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── LEMBRETES TAB ────────────────────────────────────────────────── */}
      {tab === "lembretes" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => { setRemForm({ clientName: "", clientPhone: "", serviceType: "", completedDate: new Date().toISOString().split("T")[0], notes: "" }); setRemModal(true); }} data-testid="button-new-reminder">
              <Plus className="w-4 h-4 mr-2" /> Novo Lembrete
            </Button>
          </div>

          {upcomingRem.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
              <p className="text-sm font-bold text-amber-800 flex items-center gap-2"><Bell className="w-4 h-4" /> {upcomingRem.length} lembrete(s) próximo(s) (nos próximos 30 dias)</p>
              <div className="mt-2 space-y-1">
                {upcomingRem.slice(0, 3).map(r => {
                  const { next12, next24 } = nextReminderDays(r.completedDate, r.reminder12SentAt, r.reminder24SentAt);
                  return (
                    <p key={r.id} className="text-xs text-amber-700">
                      • {r.clientName} — {next12 > 0 ? `12 meses em ${next12} dias` : `24 meses em ${next24} dias`}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          <Card>
            {remLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            ) : (reminders as MaintenanceReminder[]).length === 0 ? (
              <div className="text-center py-14 text-slate-400">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum lembrete cadastrado</p>
                <p className="text-sm mt-1">Cadastre lembretes de manutenção para avisar seus clientes após 12 e 24 meses.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(reminders as MaintenanceReminder[]).map(r => {
                  const { next12, next24 } = nextReminderDays(r.completedDate, r.reminder12SentAt, r.reminder24SentAt);
                  const msg12 = `Olá ${r.clientName}! Já faz 12 meses desde a execução do serviço de ${r.serviceType || "impermeabilização"} pela IMPPEL. Recomendamos uma vistoria preventiva para garantir a durabilidade da sua impermeabilização. Podemos agendar?`;
                  const msg24 = `Olá ${r.clientName}! Já faz 24 meses desde a execução do serviço de ${r.serviceType || "impermeabilização"} pela IMPPEL. É hora de fazer uma revisão completa. Podemos agendar uma vistoria?`;

                  return (
                    <div key={r.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors" data-testid={`row-reminder-${r.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800">{r.clientName}</p>
                        <p className="text-sm text-slate-500">{r.serviceType} · Concluído em {fmtDate(r.completedDate)}</p>
                        {r.clientPhone && <p className="text-xs text-slate-400">{r.clientPhone}</p>}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {/* 12 months */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500 w-16">12 meses:</span>
                          {r.reminder12SentAt ? (
                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" />Enviado {fmtDate(r.reminder12SentAt)}</span>
                          ) : next12 < 0 ? (
                            <span className="text-xs text-slate-400">Venceu</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className={`text-xs font-semibold ${next12 <= 30 ? "text-amber-600" : "text-slate-400"}`}>{next12} dias</span>
                              {r.clientPhone && (
                                <a href={whatsappLink(r.clientPhone, msg12)} target="_blank" rel="noreferrer"
                                  className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium hover:bg-green-200 flex items-center gap-1">
                                  <Send className="w-3 h-3" />WhatsApp
                                </a>
                              )}
                              <button onClick={() => markRem.mutate({ id: r.id, field: "12" })}
                                className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium hover:bg-slate-200">
                                Marcar enviado
                              </button>
                            </div>
                          )}
                        </div>
                        {/* 24 months */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500 w-16">24 meses:</span>
                          {r.reminder24SentAt ? (
                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" />Enviado {fmtDate(r.reminder24SentAt)}</span>
                          ) : next24 < 0 ? (
                            <span className="text-xs text-slate-400">Venceu</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className={`text-xs font-semibold ${next24 <= 30 ? "text-amber-600" : "text-slate-400"}`}>{next24} dias</span>
                              {r.clientPhone && (
                                <a href={whatsappLink(r.clientPhone, msg24)} target="_blank" rel="noreferrer"
                                  className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium hover:bg-green-200 flex items-center gap-1">
                                  <Send className="w-3 h-3" />WhatsApp
                                </a>
                              )}
                              <button onClick={() => markRem.mutate({ id: r.id, field: "24" })}
                                className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium hover:bg-slate-200">
                                Marcar enviado
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <button onClick={() => !confirm("Excluir este lembrete?") || removeRem.mutate(r.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg mt-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* NPS Create Modal */}
      <Modal isOpen={isNpsModal} onClose={() => setNpsModal(false)} title="Nova Pesquisa NPS">
        <form onSubmit={e => { e.preventDefault(); createNps.mutate({ ...npsForm, score: npsForm.score ? Number(npsForm.score) : null, status: npsForm.score ? "respondido" : "pendente" }); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-1">Nome do Cliente *</label>
              <input value={npsForm.clientName} onChange={e => setNpsForm(f => ({ ...f, clientName: e.target.value }))} required
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="Nome do cliente" data-testid="input-nps-client" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Telefone (WhatsApp)</label>
              <input value={npsForm.clientPhone} onChange={e => setNpsForm(f => ({ ...f, clientPhone: e.target.value }))}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Nota (0-10)</label>
              <input type="number" min={0} max={10} value={npsForm.score} onChange={e => setNpsForm(f => ({ ...f, score: e.target.value }))}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="Deixe em branco se pendente" data-testid="input-nps-score" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-1">Comentário do Cliente</label>
              <textarea value={npsForm.comment} onChange={e => setNpsForm(f => ({ ...f, comment: e.target.value }))} rows={2}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setNpsModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={createNps.isPending} className="flex-1" data-testid="button-save-nps">Registrar</Button>
          </div>
        </form>
      </Modal>

      {/* NPS Reply Modal */}
      <Modal isOpen={isReplyModal} onClose={() => setReplyModal(false)} title={`Resposta NPS — ${selNps?.clientName}`}>
        <form onSubmit={e => { e.preventDefault(); if (selNps) updateNps.mutate({ id: selNps.id, score: Number(replyForm.score), comment: replyForm.comment, status: "respondido" }); }} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Nota do Cliente (0 a 10) *</label>
            <div className="flex gap-2 flex-wrap">
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} type="button" onClick={() => setReplyForm(f => ({ ...f, score: String(n) }))}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-colors ${replyForm.score === String(n) ? (n >= 9 ? "bg-green-500 text-white" : n >= 7 ? "bg-amber-500 text-white" : "bg-red-500 text-white") : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {n}
                </button>
              ))}
            </div>
            {replyForm.score && <p className={`text-sm font-semibold mt-2 ${npsCategory(Number(replyForm.score)).color}`}>{npsCategory(Number(replyForm.score)).label}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">Comentário</label>
            <textarea value={replyForm.comment} onChange={e => setReplyForm(f => ({ ...f, comment: e.target.value }))} rows={3}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 resize-none"
              placeholder="O que o cliente disse?" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setReplyModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={updateNps.isPending} className="flex-1" disabled={!replyForm.score} data-testid="button-save-reply">Salvar Nota</Button>
          </div>
        </form>
      </Modal>

      {/* Reminder Create Modal */}
      <Modal isOpen={isRemModal} onClose={() => setRemModal(false)} title="Novo Lembrete de Manutenção">
        <form onSubmit={e => { e.preventDefault(); createRem.mutate(remForm); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-1">Nome do Cliente *</label>
              <input value={remForm.clientName} onChange={e => setRemForm(f => ({ ...f, clientName: e.target.value }))} required
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="Nome do cliente" data-testid="input-rem-client" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Telefone (WhatsApp)</label>
              <input value={remForm.clientPhone} onChange={e => setRemForm(f => ({ ...f, clientPhone: e.target.value }))}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Tipo de Serviço</label>
              <input value={remForm.serviceType} onChange={e => setRemForm(f => ({ ...f, serviceType: e.target.value }))}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="Ex: Manta Asfáltica" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-1">Data de Conclusão da Obra *</label>
              <input type="date" value={remForm.completedDate} onChange={e => setRemForm(f => ({ ...f, completedDate: e.target.value }))} required
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50" data-testid="input-rem-date" />
              <p className="text-xs text-slate-400 mt-1">O sistema calculará automaticamente as datas dos lembretes de 12 e 24 meses.</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-1">Observações</label>
              <textarea value={remForm.notes} onChange={e => setRemForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setRemModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={createRem.isPending} className="flex-1" data-testid="button-save-reminder">Criar Lembrete</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
