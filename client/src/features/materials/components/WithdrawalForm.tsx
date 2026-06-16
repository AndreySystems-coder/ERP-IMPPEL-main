import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowDownCircle, Camera, CheckCircle2, Package, Plus, Trash2, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MaterialAutocomplete as MaterialAutocompleteField } from "@/features/materials/components/MaterialAutocomplete";
import { PhotoCapture as MaterialPhotoCapture } from "@/features/materials/components/PhotoCapture";
import { SignaturePad as MaterialSignaturePad } from "@/features/materials/components/SignaturePad";
import { asArray } from "@/lib/safeData";
import type { InventoryItem, UserItem, WorkOrder } from "@/features/materials/types";
export function WithdrawalForm({
  inventory,
  users,
  workOrders,
  currentUser,
  isAdmin,
  onSuccess,
}: {
  inventory: InventoryItem[];
  users: UserItem[];
  workOrders: WorkOrder[];
  currentUser: any;
  isAdmin: boolean;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedOSId, setSelectedOSId] = useState("");
  const [withdrawalItems, setWithdrawalItems] = useState<{ inventoryId: number; productName: string; unit: string; quantity: number }[]>([]);
  const [addingItemId, setAddingItemId] = useState("");
  const [addingQty, setAddingQty] = useState("1");
  const [saidaPhoto, setSaidaPhoto] = useState<string | null>(null);
  const [saidaSignature, setSaidaSignature] = useState<string | null>(null);
  const [saidaNotes, setSaidaNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const inventoryList = asArray<InventoryItem>(inventory);
  const usersList = asArray<UserItem>(users);
  const workOrdersList = asArray<WorkOrder>(workOrders);

  const inventoryAvailable = inventoryList.filter(i => i.quantity > 0);

  const createWithdrawalMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/material-withdrawals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      toast({ title: "Saída registrada", description: "Estoque atualizado e responsabilidade vinculada ao funcionário." });
      setSelectedUserId(""); setSelectedOSId(""); setWithdrawalItems([]);
      setSaidaPhoto(null); setSaidaSignature(null); setSaidaNotes(""); setShowNotes(false);
      onSuccess?.();
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const addItem = () => {
    if (!addingItemId) return;
    const inv = inventoryAvailable.find(i => i.id === Number(addingItemId));
    if (!inv) return;
    const qty = parseInt(addingQty) || 1;
    const existing = withdrawalItems.findIndex(i => i.inventoryId === inv.id);
    if (existing >= 0) {
      const updated = [...withdrawalItems]; updated[existing].quantity += qty; setWithdrawalItems(updated);
    } else {
      setWithdrawalItems(prev => [...prev, { inventoryId: inv.id, productName: inv.name, unit: inv.unit || "unid", quantity: qty }]);
    }
    setAddingItemId(""); setAddingQty("1");
  };

  const handleSubmit = () => {
    const effectiveUserId = isAdmin ? selectedUserId : String(currentUser?.id || "");
    if (!effectiveUserId) return toast({ title: "Selecione o funcionário", description: "Informe quem ficará responsável pelos materiais.", variant: "destructive" });
    if (withdrawalItems.length === 0) return toast({ title: "Adicione um material", description: "Busque o material, informe a quantidade e toque em Adicionar.", variant: "destructive" });
    if (!saidaPhoto) return toast({ title: "Falta a foto da retirada", description: "Registre uma foto dos materiais antes de confirmar.", variant: "destructive" });
    if (!saidaSignature) return toast({ title: "Falta a assinatura", description: "Confirme a responsabilidade assinando no quadro.", variant: "destructive" });
    const user = isAdmin ? usersList.find(u => u.id === Number(effectiveUserId)) : currentUser;
    const os = workOrdersList.find(o => o.id === Number(selectedOSId));
    createWithdrawalMutation.mutate({
      userId: Number(effectiveUserId), username: (user as any)?.username || "",
      workOrderId: selectedOSId && selectedOSId !== "none" ? Number(selectedOSId) : null,
      jobId: null, clientName: os?.clientName || null,
      withdrawalPhoto: saidaPhoto, withdrawalSignature: saidaSignature,
      notes: saidaNotes || null, items: withdrawalItems,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Responsável</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Funcionário <span className="text-red-500">*</span></Label>
            {isAdmin ? (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger data-testid="select-trigger-employee"><SelectValue placeholder="Selecionar funcionário..." /></SelectTrigger>
                <SelectContent>
                  {usersList.map(u => <SelectItem key={u.id} value={String(u.id)} data-testid={`option-employee-${u.id}`}>{u.username} ({u.role === "admin" ? "Admin" : "Funcionário"})</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2.5 border rounded-lg bg-blue-50 border-blue-200">
                <div className="w-7 h-7 bg-blue-900 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {currentUser?.username?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-gray-800" data-testid="text-current-user">{currentUser?.username}</span>
                <Badge variant="outline" className="ml-auto text-xs text-blue-700 border-blue-300">você</Badge>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>Ordem de Serviço</Label>
            <Select value={selectedOSId} onValueChange={setSelectedOSId}>
              <SelectTrigger data-testid="select-trigger-os"><SelectValue placeholder="Vincular à OS (opcional)..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem vínculo</SelectItem>
                {workOrdersList.map(o => <SelectItem key={o.id} value={String(o.id)}>OS #{o.id} — {o.clientName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> Materiais Retirados <span className="text-red-500 text-sm">*</span></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_104px_132px] sm:items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-gray-500">1. Buscar material</Label>
              <MaterialAutocompleteField
                inventory={inventoryAvailable}
                selectedId={addingItemId}
                onSelect={item => setAddingItemId(item.id ? String(item.id) : "")}
              />
            </div>
            <div className="w-24 space-y-1">
              <Label className="text-xs text-gray-500">2. Qtd.</Label>
              <Input type="number" min="1" value={addingQty} onChange={e => setAddingQty(e.target.value)} data-testid="input-quantity" className="h-11 text-center" />
            </div>
            <Button type="button" onClick={addItem} disabled={!addingItemId} className="h-11 w-full bg-blue-900 text-white hover:bg-blue-800" data-testid="button-add-item">
              <Plus className="w-4 h-4 sm:mr-1" />
              <span>3. Adicionar</span>
            </Button>
          </div>
          {withdrawalItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">Nenhum material adicionado ainda</p>
          ) : (
            <div className="space-y-2">
              {withdrawalItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 sm:grid-cols-[auto_minmax(0,1fr)_80px_auto] sm:items-center" data-testid={`row-withdrawal-item-${idx}`}>
                  <Package className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="flex-1"><p className="font-semibold text-sm text-gray-800">{item.productName}</p><p className="text-xs text-gray-500">{item.unit}</p></div>
                  <Input type="number" min="1" value={item.quantity} onChange={e => setWithdrawalItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: parseInt(e.target.value) || 1 } : it))} className="col-start-2 w-full text-center sm:col-start-auto sm:w-20" data-testid={`input-item-qty-${idx}`} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setWithdrawalItems(prev => prev.filter((_, i) => i !== idx))} data-testid={`button-remove-item-${idx}`}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4" /> Comprovante e Assinatura</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MaterialPhotoCapture label="Foto da Retirada" value={saidaPhoto} onPhoto={setSaidaPhoto} />
          <MaterialSignaturePad label="Assinatura do Responsável *" onSave={setSaidaSignature} />
          {saidaSignature && (
            <div className="md:col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800">Assinatura confirmada</p>
                <img src={saidaSignature} alt="Assinatura" className="h-12 mt-1" />
              </div>
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
          <span>Observações da saída</span>
          <span className="text-xs font-medium text-blue-700">{showNotes ? "Ocultar" : "Adicionar se precisar"}</span>
        </button>
        {showNotes && (
          <div className="mt-3 space-y-2">
            <Label className="text-xs text-gray-500">Detalhe opcional</Label>
            <Textarea value={saidaNotes} onChange={e => setSaidaNotes(e.target.value)} placeholder="Destino, obra ou observação rápida." rows={2} data-testid="textarea-notes" />
          </div>
        )}
      </div>

      {/* Validation checklist */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { ok: !!((isAdmin ? selectedUserId : currentUser?.id)), label: "Funcionário" },
          { ok: withdrawalItems.length > 0, label: "Material" },
          { ok: !!saidaPhoto, label: "Foto" },
          { ok: !!saidaSignature, label: "Assinatura" },
        ].map(({ ok, label }) => (
          <div key={label} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${ok ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${ok ? "text-green-600" : "text-gray-300"}`} />
            {label}
          </div>
        ))}
      </div>

      <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white h-14 text-base font-bold rounded-xl"
        onClick={handleSubmit} disabled={createWithdrawalMutation.isPending} data-testid="button-registrar-saida">
        <ArrowDownCircle className="w-5 h-5 mr-2" />
        {createWithdrawalMutation.isPending ? "Registrando..." : "Confirmar Retirada de Material"}
      </Button>
    </div>
  );
}
