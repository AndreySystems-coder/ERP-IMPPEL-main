import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, ClipboardCheck, PackageCheck, Repeat2, ShieldAlert, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InventoryItem, UserItem, Withdrawal, WorkOrder } from "@/features/materials/types";

type Row = Record<string, any>;

const endpoints = [
  "/api/material-responsibility/transfers",
  "/api/material-responsibility/cases",
  "/api/material-responsibility/kits",
  "/api/material-responsibility/kit-items",
  "/api/material-responsibility/maintenance",
  "/api/material-responsibility/count-audits",
  "/api/material-responsibility/training",
  "/api/material-responsibility/indicators",
];

function invalidateStage6() {
  endpoints.forEach(endpoint => queryClient.invalidateQueries({ queryKey: [endpoint] }));
}

function useStage6Post(endpoint: string, success: string) {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: Row) => {
      const response = await apiRequest("POST", endpoint, payload);
      return response.json();
    },
    onSuccess: () => {
      invalidateStage6();
      toast({ title: success });
    },
    onError: (error: Error) => toast({ title: "Nao foi possivel registrar", description: error.message, variant: "destructive" }),
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function statusBadge(status?: string) {
  const value = status || "pendente";
  const color = ["concluida", "concluída", "aceito", "aprovado"].includes(value) ? "default" : value === "bloqueante" ? "destructive" : "secondary";
  return <Badge variant={color as any}>{value}</Badge>;
}

export function MaterialResponsibilityGovernance({
  inventory,
  users,
  workOrders,
  withdrawals,
}: {
  inventory: InventoryItem[];
  users: UserItem[];
  workOrders: WorkOrder[];
  withdrawals: Withdrawal[];
}) {
  const [transfer, setTransfer] = useState({ withdrawalId: "", withdrawalItemId: "", inventoryId: "", productName: "", quantity: "1", previousUserId: "", previousUsername: "", newUserId: "", newUsername: "", workOrderId: "", reason: "" });
  const [caseForm, setCaseForm] = useState({ withdrawalId: "", withdrawalItemId: "", inventoryId: "", productName: "", workOrderId: "", userId: "", username: "", type: "dano", severity: "administrativa", description: "" });
  const [kit, setKit] = useState({ name: "", type: "funcao", roleName: "", assignedUserId: "", assignedUsername: "", notes: "" });
  const [maintenance, setMaintenance] = useState({ inventoryId: "", productName: "", withdrawalId: "", defectDescription: "" });
  const [countAudit, setCountAudit] = useState({ inventoryId: "", productName: "", systemQuantity: "0", physicalQuantity: "0", reason: "" });
  const [training, setTraining] = useState({ title: "Como trabalhar - Controle de Materiais", content: "Roteiro editavel: retirar, confirmar responsabilidade, registrar problema, devolver e consultar pendencias. PENDENTE DE VALIDACAO DA IMPPEL." });

  const transfers = useQuery<Row[]>({ queryKey: ["/api/material-responsibility/transfers"] });
  const cases = useQuery<Row[]>({ queryKey: ["/api/material-responsibility/cases"] });
  const kits = useQuery<Row[]>({ queryKey: ["/api/material-responsibility/kits"] });
  const maintenanceRows = useQuery<Row[]>({ queryKey: ["/api/material-responsibility/maintenance"] });
  const indicators = useQuery<Row>({ queryKey: ["/api/material-responsibility/indicators"] });

  const createTransfer = useStage6Post("/api/material-responsibility/transfers", "Transferencia registrada");
  const createCase = useStage6Post("/api/material-responsibility/cases", "Ocorrencia registrada");
  const createKit = useStage6Post("/api/material-responsibility/kits", "Kit registrado");
  const createMaintenance = useStage6Post("/api/material-responsibility/maintenance", "Manutencao registrada");
  const createCountAudit = useStage6Post("/api/material-responsibility/count-audits", "Divergencia de contagem registrada");
  const createTraining = useStage6Post("/api/material-responsibility/training", "Treinamento registrado como rascunho");

  const returnableItems = useMemo(() => inventory.filter(item => ["ferramenta", "equipamento", "epi_reutilizavel"].includes(String((item as any).type || "").toLowerCase())), [inventory]);
  const pendingWithdrawals = withdrawals.filter(row => row.status === "pendente" || row.status === "parcial");

  const selectInventory = (id: string, setter: (value: any) => void) => {
    const item = inventory.find(row => String(row.id) === id);
    setter((current: any) => ({ ...current, inventoryId: id, productName: item?.name || "", systemQuantity: String(item?.quantity ?? current.systemQuantity ?? 0) }));
  };

  const selectUser = (id: string, setter: (value: any) => void, prefix: "new" | "case") => {
    const user = users.find(row => String(row.id) === id);
    setter((current: any) => prefix === "new"
      ? { ...current, newUserId: id, newUsername: user?.username || "" }
      : { ...current, userId: id, username: user?.username || "" });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Nenhuma providencia financeira e aplicada automaticamente. Perdas, danos e manutencoes viram ocorrencias para analise administrativa.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Pendencias", indicators.data?.pendingWithdrawals || 0, AlertTriangle],
          ["Transferencias", indicators.data?.pendingTransfers || 0, Repeat2],
          ["Ocorrencias", indicators.data?.openCases || 0, ShieldAlert],
          ["Manutencao", indicators.data?.maintenanceOpen || 0, Wrench],
        ].map(([label, value, Icon]: any) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4" /> {label}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{value}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Repeat2 className="h-4 w-4" /> Transferencia de responsabilidade</CardTitle><CardDescription>Registra cadeia de custodia sem alterar responsavel silenciosamente.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Retirada pendente">
              <Select value={transfer.withdrawalId} onValueChange={value => {
                const selected = pendingWithdrawals.find(row => String(row.id) === value) as any;
                setTransfer(current => ({ ...current, withdrawalId: value, previousUserId: String(selected?.userId || ""), previousUsername: selected?.username || "", workOrderId: String(selected?.workOrderId || "") }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecionar retirada" /></SelectTrigger>
                <SelectContent>{pendingWithdrawals.map(row => <SelectItem key={row.id} value={String(row.id)}>#{row.id} - {row.username}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Item"><Select value={transfer.inventoryId} onValueChange={id => selectInventory(id, setTransfer)}><SelectTrigger><SelectValue placeholder="Ferramenta/equipamento" /></SelectTrigger><SelectContent>{returnableItems.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Novo responsavel"><Select value={transfer.newUserId} onValueChange={id => selectUser(id, setTransfer, "new")}><SelectTrigger><SelectValue placeholder="Funcionario" /></SelectTrigger><SelectContent>{users.map(user => <SelectItem key={user.id} value={String(user.id)}>{user.username}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Quantidade"><Input value={transfer.quantity} onChange={event => setTransfer({ ...transfer, quantity: event.target.value })} /></Field>
              <Field label="Motivo"><Input value={transfer.reason} onChange={event => setTransfer({ ...transfer, reason: event.target.value })} placeholder="Entrega para outro responsavel" /></Field>
            </div>
            <Button className="w-full" onClick={() => createTransfer.mutate(transfer)} disabled={createTransfer.isPending}>Registrar transferencia</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4" /> Ocorrencia e apuracao</CardTitle><CardDescription>Para dano, perda, divergencia ou atraso. Sem desconto automatico.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Item"><Select value={caseForm.inventoryId} onValueChange={id => selectInventory(id, setCaseForm)}><SelectTrigger><SelectValue placeholder="Selecionar item" /></SelectTrigger><SelectContent>{inventory.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Funcionario"><Select value={caseForm.userId} onValueChange={id => selectUser(id, setCaseForm, "case")}><SelectTrigger><SelectValue placeholder="Responsavel" /></SelectTrigger><SelectContent>{users.map(user => <SelectItem key={user.id} value={String(user.id)}>{user.username}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Tipo"><Select value={caseForm.type} onValueChange={type => setCaseForm({ ...caseForm, type })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["dano", "perda", "manutencao", "divergencia", "atraso", "sobra", "outro"].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Gravidade"><Select value={caseForm.severity} onValueChange={severity => setCaseForm({ ...caseForm, severity })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["informativa", "administrativa", "bloqueante"].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="OS"><Select value={caseForm.workOrderId} onValueChange={workOrderId => setCaseForm({ ...caseForm, workOrderId })}><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger><SelectContent>{workOrders.map(order => <SelectItem key={order.id} value={String(order.id)}>OS #{order.id} - {order.clientName || "sem cliente"}</SelectItem>)}</SelectContent></Select></Field>
            </div>
            <Field label="Descricao"><Textarea value={caseForm.description} onChange={event => setCaseForm({ ...caseForm, description: event.target.value })} placeholder="Descreva o fato, sem presumir culpa." /></Field>
            <Button className="w-full" onClick={() => createCase.mutate(caseForm)} disabled={createCase.isPending}>Abrir ocorrencia</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PackageCheck className="h-4 w-4" /> Kits por funcao ou funcionario</CardTitle><CardDescription>Estrutura para kit padrao, individual ou por equipe.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Nome"><Input value={kit.name} onChange={event => setKit({ ...kit, name: event.target.value })} placeholder="Kit Aplicador" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo"><Select value={kit.type} onValueChange={type => setKit({ ...kit, type })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["funcao", "individual", "equipe"].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Funcionario"><Select value={kit.assignedUserId} onValueChange={id => {
                const user = users.find(row => String(row.id) === id);
                setKit(current => ({ ...current, assignedUserId: id, assignedUsername: user?.username || "" }));
              }}><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger><SelectContent>{users.map(user => <SelectItem key={user.id} value={String(user.id)}>{user.username}</SelectItem>)}</SelectContent></Select></Field>
            </div>
            <Button className="w-full" onClick={() => createKit.mutate(kit)} disabled={createKit.isPending}>Registrar kit</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Manutencao</CardTitle><CardDescription>Equipamento em manutencao fica sinalizado para nao ser tratado como disponivel.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Ferramenta/equipamento"><Select value={maintenance.inventoryId} onValueChange={id => selectInventory(id, setMaintenance)}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{returnableItems.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Defeito / motivo"><Textarea value={maintenance.defectDescription} onChange={event => setMaintenance({ ...maintenance, defectDescription: event.target.value })} /></Field>
            <Button className="w-full" onClick={() => createMaintenance.mutate(maintenance)} disabled={createMaintenance.isPending}>Solicitar manutencao</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" /> Contagem e conciliacao</CardTitle><CardDescription>Registra divergencia antes de qualquer ajuste de estoque.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Item"><Select value={countAudit.inventoryId} onValueChange={id => selectInventory(id, setCountAudit)}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{inventory.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Sistema"><Input value={countAudit.systemQuantity} onChange={event => setCountAudit({ ...countAudit, systemQuantity: event.target.value })} /></Field>
              <Field label="Fisico"><Input value={countAudit.physicalQuantity} onChange={event => setCountAudit({ ...countAudit, physicalQuantity: event.target.value })} /></Field>
            </div>
            <Field label="Motivo"><Textarea value={countAudit.reason} onChange={event => setCountAudit({ ...countAudit, reason: event.target.value })} /></Field>
            <Button className="w-full" onClick={() => createCountAudit.mutate(countAudit)} disabled={createCountAudit.isPending}>Registrar divergencia</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4" /> Como Trabalhar</CardTitle><CardDescription>Roteiro-base editavel. Conteudo oficial depende da IMPPEL.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Titulo"><Input value={training.title} onChange={event => setTraining({ ...training, title: event.target.value })} /></Field>
            <Field label="Conteudo"><Textarea value={training.content} onChange={event => setTraining({ ...training, content: event.target.value })} /></Field>
            <Button className="w-full" onClick={() => createTraining.mutate(training)} disabled={createTraining.isPending}>Salvar treinamento</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-base">Ocorrencias abertas</CardTitle></CardHeader><CardContent className="space-y-2">{(cases.data || []).slice(0, 5).map(row => <div key={row.id} className="rounded-lg border p-2 text-sm"><div className="flex justify-between gap-2"><span className="font-semibold">{row.productName}</span>{statusBadge(row.status)}</div><p className="text-xs text-slate-500">{row.type} - {row.username || "sem responsavel"}</p></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Transferencias</CardTitle></CardHeader><CardContent className="space-y-2">{(transfers.data || []).slice(0, 5).map(row => <div key={row.id} className="rounded-lg border p-2 text-sm"><div className="flex justify-between gap-2"><span className="font-semibold">{row.productName}</span>{statusBadge(row.status)}</div><p className="text-xs text-slate-500">{row.previousUsername || "estoque"} para {row.newUsername}</p></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Kits e manutencoes</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-sm text-slate-600">{(kits.data || []).length} kit(s) cadastrados.</p><p className="text-sm text-slate-600">{(maintenanceRows.data || []).length} manutencao(oes) registradas.</p><p className="text-xs text-slate-500">A inclusao dos itens do kit deve ser feita com catalogo validado pela IMPPEL.</p></CardContent></Card>
      </div>
    </div>
  );
}
