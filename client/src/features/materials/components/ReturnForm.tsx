import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpCircle, Calendar, Camera, CheckCircle2, ChevronDown, ChevronRight, Package, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PhotoCapture as MaterialPhotoCapture } from "@/features/materials/components/PhotoCapture";
import { SignaturePad as MaterialSignaturePad } from "@/features/materials/components/SignaturePad";
import { daysSince, fmtDate } from "@/features/materials/material-control-utils";
import type { Withdrawal } from "@/features/materials/types";
import { isReturnableMaterialItem } from "@shared/materialReturnPolicy";

function withdrawalOptionLabel(withdrawal: Withdrawal) {
  const date = fmtDate(withdrawal.withdrawalDate || withdrawal.createdAt).split(" ")[0];
  const items = withdrawal.items.filter(isReturnableMaterialItem);
  const itemNames = items.slice(0, 3).map(item => item.productName).join(", ");
  const suffix = items.length > 3 ? ` +${items.length - 3}` : "";
  return `${date} — ${withdrawal.username} — ${items.length} item(ns) — ${itemNames}${suffix}`;
}

function dayKey(withdrawal: Withdrawal) {
  return new Date(`${withdrawal.withdrawalDate || withdrawal.createdAt}`).toISOString().slice(0, 10);
}

export function ReturnForm({
  pendingWithdrawals,
  currentUser,
  isAdmin,
  onSuccess,
}: {
  pendingWithdrawals: Withdrawal[];
  currentUser: any;
  isAdmin: boolean;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [retornoWithdrawalId, setRetornoWithdrawalId] = useState("");
  const [retornoItems, setRetornoItems] = useState<{ id: number; returnedQuantity: number; condition: string; included: boolean }[]>([]);
  const [retornoPhoto, setRetornoPhoto] = useState<string | null>(null);
  const [retornoSignature, setRetornoSignature] = useState<string | null>(null);
  const [retornoNotes, setRetornoNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const myPending = isAdmin ? pendingWithdrawals : pendingWithdrawals.filter(w => w.userId === currentUser?.id);
  const selectedWithdrawal = pendingWithdrawals.find(w => w.id === Number(retornoWithdrawalId));

  const pendingByDay = useMemo(() => {
    const groups = new Map<string, Withdrawal[]>();
    myPending.forEach(w => groups.set(dayKey(w), [...(groups.get(dayKey(w)) || []), w]));
    return Array.from(groups.entries()).sort(([left], [right]) => right.localeCompare(left));
  }, [myPending]);

  useEffect(() => {
    if (!selectedWithdrawal) { setRetornoItems([]); return; }
    setRetornoItems(selectedWithdrawal.items.filter(isReturnableMaterialItem).map(i => ({ id: i.id!, returnedQuantity: i.quantity, condition: "bom", included: true })));
  }, [retornoWithdrawalId]);

  const retornoMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("POST", `/api/material-withdrawals/${id}/retorno`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salary-discounts"] });
      toast({ title: "Devolução registrada", description: "Estoque e condição dos materiais foram atualizados." });
      setRetornoWithdrawalId(""); setRetornoPhoto(null); setRetornoSignature(null); setRetornoNotes(""); setShowNotes(false); setOpenDay(null);
      onSuccess?.();
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const includedItems = retornoItems.filter(item => item.included);

  const handleSubmit = () => {
    if (!retornoWithdrawalId) return toast({ title: "Selecione uma saída", description: "Escolha qual retirada está sendo devolvida.", variant: "destructive" });
    if (includedItems.length === 0) return toast({ title: "Selecione ao menos um item", description: "Marque quais itens estão voltando nesta devolução.", variant: "destructive" });
    if (!retornoPhoto) return toast({ title: "Falta a foto do retorno", description: "Registre uma foto dos materiais devolvidos.", variant: "destructive" });
    if (!retornoSignature) return toast({ title: "Falta a assinatura", description: "Confirme a devolução assinando no quadro.", variant: "destructive" });
    retornoMutation.mutate({ id: Number(retornoWithdrawalId), data: { returnPhoto: retornoPhoto, returnSignature: retornoSignature, returnNotes: retornoNotes, items: includedItems } });
  };

  if (myPending.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-gray-500">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
        <p className="font-semibold text-green-700">Nenhuma saída pendente</p>
        <p className="text-sm mt-1 text-gray-400">Todos os materiais foram devolvidos</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">1. Escolher saída pendente</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isAdmin ? (
            <div className="space-y-2">
              {pendingByDay.map(([key, dayWithdrawals]) => {
                const expanded = openDay === key;
                const employees = new Set(dayWithdrawals.map(w => w.username));
                return (
                  <div key={key} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenDay(expanded ? null : key)}
                      className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50"
                      data-testid={`button-open-return-day-${key}`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700"><Calendar className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold capitalize text-slate-900">{new Date(`${key}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
                        <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>{dayWithdrawals.length} saída(s) pendente(s)</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {employees.size} funcionário(s)</span>
                        </div>
                      </div>
                      {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </button>
                    {expanded && (
                      <div className="space-y-2 border-t border-slate-100 bg-slate-50 p-2">
                        {dayWithdrawals.map(w => {
                          const dias = daysSince(w.withdrawalDate || w.createdAt);
                          const active = retornoWithdrawalId === String(w.id);
                          return (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => setRetornoWithdrawalId(String(w.id))}
                              className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${active ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-white hover:border-orange-200"}`}
                              data-testid={`option-withdrawal-${w.id}`}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">{w.username}{w.clientName ? ` · ${w.clientName}` : ""}</p>
                                <p className="mt-0.5 truncate text-xs text-slate-500">{withdrawalOptionLabel(w)}</p>
                              </div>
                              {dias > 3 && <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{dias}d</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Select value={retornoWithdrawalId} onValueChange={setRetornoWithdrawalId}>
              <SelectTrigger data-testid="select-trigger-withdrawal"><SelectValue placeholder="Escolher material em uso..." /></SelectTrigger>
              <SelectContent>
                {myPending.map(w => {
                  const withdrawalDate = w.withdrawalDate || w.createdAt;
                  const dias = daysSince(withdrawalDate);
                  return (
                    <SelectItem key={w.id} value={String(w.id)} data-testid={`option-withdrawal-${w.id}`}>
                      {withdrawalOptionLabel(w)} {dias > 3 ? `— ${dias}d` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {selectedWithdrawal && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm space-y-1">
              <p className="font-semibold text-orange-800">Saída #{selectedWithdrawal.id} — {selectedWithdrawal.username}</p>
              <p className="text-orange-700">Retirada em: {fmtDate(selectedWithdrawal.withdrawalDate || selectedWithdrawal.createdAt)}</p>
              {selectedWithdrawal.clientName && <p className="text-orange-700">Cliente: {selectedWithdrawal.clientName}</p>}
              {selectedWithdrawal.workOrderId && <p className="text-orange-700">OS: #{selectedWithdrawal.workOrderId}</p>}
              {daysSince(selectedWithdrawal.withdrawalDate || selectedWithdrawal.createdAt) > 3 && (
                <p className="text-red-600 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {daysSince(selectedWithdrawal.withdrawalDate || selectedWithdrawal.createdAt)} dias sem retorno!</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedWithdrawal && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Escolher o que voltou</CardTitle>
              <p className="text-xs font-normal text-gray-500">Desmarque o que ainda ficou com o funcionário — só o marcado entra nesta devolução.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedWithdrawal.items.filter(isReturnableMaterialItem).map((item, idx) => {
                const retItem = retornoItems.find(r => r.id === item.id) || { id: item.id!, returnedQuantity: item.quantity, condition: "bom", included: true };
                const updateRetItem = (field: string, value: any) => setRetornoItems(prev => {
                  const ex = prev.find(r => r.id === item.id!);
                  if (ex) return prev.map(r => r.id === item.id! ? { ...r, [field]: value } : r);
                  return [...prev, { id: item.id!, returnedQuantity: item.quantity, condition: "bom", included: true, [field]: value }];
                });
                return (
                  <div key={item.id} className={`p-4 border-2 rounded-xl space-y-3 transition-colors ${retItem.included ? "border-gray-100" : "border-gray-100 bg-gray-50 opacity-60"}`} data-testid={`card-return-item-${idx}`}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={retItem.included} onChange={e => updateRetItem("included", e.target.checked)} className="h-4 w-4 accent-green-600" data-testid={`checkbox-include-${idx}`} />
                      <Package className="w-4 h-4 text-gray-500" />
                      <div><p className="font-semibold">{item.productName}</p><p className="text-xs text-gray-500">Saiu: {item.quantity} {item.unit}</p></div>
                    </label>
                    <fieldset disabled={!retItem.included} className="grid grid-cols-1 gap-3 sm:grid-cols-2 disabled:opacity-50">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Qtd. devolvida</Label>
                        <Input type="number" min="0" max={item.quantity} value={retItem.returnedQuantity}
                          onChange={e => updateRetItem("returnedQuantity", parseInt(e.target.value) || 0)} data-testid={`input-returned-qty-${idx}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Condição <span className="text-red-500">*</span></Label>
                        <Select value={retItem.condition} onValueChange={v => updateRetItem("condition", v)} data-testid={`select-condition-${idx}`}>
                          <SelectTrigger data-testid={`select-trigger-condition-${idx}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bom">✅ Bom estado</SelectItem>
                            <SelectItem value="danificado">⚠️ Danificado</SelectItem>
                            <SelectItem value="perdido">❌ Perdido</SelectItem>
                            <SelectItem value="manutencao">🔧 Manutenção</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </fieldset>
                    {retItem.included && (retItem.condition === "perdido" || retItem.condition === "danificado" || retItem.condition === "manutencao") && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> Este item não volta ao disponível. Perdidos, danificados e manutenção seguem para avaliação do gestor.
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4" /> 3. Comprovante do retorno</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MaterialPhotoCapture label="Foto do Retorno" value={retornoPhoto} onPhoto={setRetornoPhoto} />
              <MaterialSignaturePad label="Assinatura *" onSave={setRetornoSignature} />
              {retornoSignature && (
                <div className="md:col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <div><p className="text-sm font-semibold text-green-800">Assinatura confirmada</p><img src={retornoSignature} alt="Assinatura" className="h-12 mt-1" /></div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <button
              type="button"
              onClick={() => setShowNotes(prev => !prev)}
              className="flex w-full items-center justify-between text-left text-sm font-semibold text-gray-700"
            >
              <span>Observações do retorno</span>
              <span className="text-xs font-medium text-blue-700">{showNotes ? "Ocultar" : "Adicionar se precisar"}</span>
            </button>
            {showNotes && (
              <div className="mt-3 space-y-2">
                <Label className="text-xs text-gray-500">Detalhe opcional</Label>
                <Textarea value={retornoNotes} onChange={e => setRetornoNotes(e.target.value)} placeholder="Estado dos materiais ou ocorrência rápida." rows={2} data-testid="textarea-return-notes" />
              </div>
            )}
          </div>

          {/* Validation checklist */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { ok: !!retornoWithdrawalId, label: "Saída selecionada" },
              { ok: includedItems.length > 0, label: "Item(ns) marcado(s)" },
              { ok: !!retornoPhoto, label: "Foto" },
              { ok: !!retornoSignature, label: "Assinatura" },
            ].map(({ ok, label }) => (
              <div key={label} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${ok ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${ok ? "text-green-600" : "text-gray-300"}`} />
                {label}
              </div>
            ))}
          </div>

          <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-base font-bold rounded-xl"
            onClick={handleSubmit} disabled={retornoMutation.isPending} data-testid="button-registrar-retorno">
            <ArrowUpCircle className="w-5 h-5 mr-2" />
            {retornoMutation.isPending ? "Registrando..." : "Confirmar Devolução de Material"}
          </Button>
        </>
      )}
    </div>
  );
}
