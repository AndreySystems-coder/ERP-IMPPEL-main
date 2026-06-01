import { useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, ChevronLeft, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MaterialFlowStepper } from "@/features/materials/components/MaterialFlowStepper";
import { MovementHistoryPanel } from "@/features/materials/components/MovementHistoryPanel";
import { ReturnForm } from "@/features/materials/components/ReturnForm";
import { WithdrawalForm } from "@/features/materials/components/WithdrawalForm";
import { daysSince, fmtDate } from "@/features/materials/material-control-utils";
import type { InventoryItem, UserItem, Withdrawal, WorkOrder } from "@/features/materials/types";
export function EmployeeView({
  inventory,
  users,
  workOrders,
  currentUser,
  withdrawals,
}: {
  inventory: InventoryItem[];
  users: UserItem[];
  workOrders: WorkOrder[];
  currentUser: any;
  withdrawals: Withdrawal[];
}) {
  const [action, setAction] = useState<null | "saida" | "retorno" | "historico">(null);
  const [lastFeedback, setLastFeedback] = useState<null | "saida" | "retorno">(null);
  const pendingWithdrawals = withdrawals.filter(w => w.status !== "retornado");
  const myPending = pendingWithdrawals.filter(w => w.userId === currentUser?.id);
  const myHistory = withdrawals.filter(w => w.userId === currentUser?.id);
  const myReturnedCount = myHistory.filter(w => w.status === "retornado").length;
  const myOverdueCount = myPending.filter(w => daysSince(w.createdAt) > 3).length;

  if (action === "saida") {
    return (
      <div className="space-y-4">
        <button onClick={() => setAction(null)} className="flex h-10 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800" data-testid="button-back-to-menu">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500">
            <ArrowDownCircle className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Etapa 1 de 3</p>
            <p className="font-bold text-gray-900">Retirada de Material</p>
            <p className="text-xs text-gray-500">Preencha todos os campos obrigatórios</p>
          </div>
        </div>
        <WithdrawalForm
          inventory={inventory} users={users} workOrders={workOrders}
          currentUser={currentUser} isAdmin={false}
          onSuccess={() => {
            setLastFeedback("saida");
            setAction(null);
          }}
        />
      </div>
    );
  }

  if (action === "retorno") {
    return (
      <div className="space-y-4">
        <button onClick={() => setAction(null)} className="flex h-10 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800" data-testid="button-back-to-menu">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-600">
            <ArrowUpCircle className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">Etapa 3 de 3</p>
            <p className="font-bold text-gray-900">Devolução de Material</p>
            <p className="text-xs text-gray-500">Selecione a saída e informe a condição</p>
          </div>
        </div>
        <ReturnForm
          pendingWithdrawals={pendingWithdrawals} currentUser={currentUser} isAdmin={false}
          onSuccess={() => {
            setLastFeedback("retorno");
            setAction(null);
          }}
        />
      </div>
    );
  }

  if (action === "historico") {
    return (
      <div className="space-y-4">
        <button onClick={() => setAction(null)} className="flex h-10 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800" data-testid="button-back-to-menu">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <MovementHistoryPanel
          withdrawals={myHistory}
          title="Meu histórico"
          description="Veja cada retirada com saída, uso e devolução em uma linha do tempo."
          compact
        />
      </div>
    );
  }
  // Main menu view
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center gap-3 rounded-lg bg-blue-900 p-4 text-white">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
          {currentUser?.username?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-bold">Olá, {currentUser?.username}</p>
          <p className="text-xs text-blue-200">Controle de materiais</p>
        </div>
        <div className="ml-auto shrink-0 text-right">
          <p className="text-2xl font-bold">{myPending.length}</p>
          <p className="text-xs text-blue-200">pendente(s)</p>
        </div>
      </div>

      <MaterialFlowStepper pendingCount={myPending.length} returnedCount={myReturnedCount} overdueCount={myOverdueCount} />

      {lastFeedback && (
        <div className={`rounded-lg border px-4 py-3 ${lastFeedback === "saida" ? "border-orange-200 bg-orange-50 text-orange-800" : "border-green-200 bg-green-50 text-green-800"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold">{lastFeedback === "saida" ? "Saída registrada com sucesso" : "Devolução registrada com sucesso"}</p>
              <p className="mt-0.5 text-xs opacity-80">
                {lastFeedback === "saida"
                  ? "O estoque foi atualizado e o material ficou vinculado à sua responsabilidade."
                  : "O retorno foi registrado com foto, assinatura e condição do material."}
              </p>
            </div>
            <button type="button" onClick={() => setLastFeedback(null)} className="text-xs font-semibold opacity-70 hover:opacity-100">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Pending alert */}
      {myPending.length > 0 && (
        <div className="space-y-3 rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
          <p className="font-bold text-orange-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Você tem {myPending.length} retirada(s) pendente(s)
          </p>
          {myPending.map(w => (
            <div key={w.id} className="space-y-1.5 rounded-lg border border-orange-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800">Saída #{w.id}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${daysSince(w.createdAt) > 3 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                  {daysSince(w.createdAt)}d atrás
                </span>
              </div>
              <p className="text-xs text-gray-500">{fmtDate(w.createdAt)}{w.clientName ? ` · ${w.clientName}` : ""}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {w.items.map((item, i) => (
                  <span key={i} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                    {item.productName} ({item.quantity} {item.unit})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Two big action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => { setLastFeedback(null); setAction("saida"); }}
          className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-lg bg-orange-500 p-6 text-white shadow-lg transition-all hover:bg-orange-600 active:scale-95"
          data-testid="button-action-saida"
        >
          <ArrowDownCircle className="w-10 h-10" />
          <div className="text-center">
            <p className="text-lg font-bold">Retirar Material</p>
            <p className="text-xs text-orange-100 mt-0.5">Registrar saída de materiais</p>
          </div>
        </button>
        <button
          onClick={() => { setLastFeedback(null); setAction("retorno"); }}
          className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-lg bg-green-600 p-6 text-white shadow-lg transition-all hover:bg-green-700 active:scale-95"
          data-testid="button-action-retorno"
        >
          <ArrowUpCircle className="w-10 h-10" />
          <div className="text-center">
            <p className="text-lg font-bold">Devolver Material</p>
            <p className="text-xs text-green-100 mt-0.5">Confirmar devolução</p>
          </div>
        </button>
      </div>

      {/* History shortcut */}
      <button
        onClick={() => setAction("historico")}
        className="flex w-full items-center justify-between rounded-lg border-2 border-gray-100 bg-white px-5 py-4 text-gray-600 transition-all hover:border-gray-200"
        data-testid="button-action-historico"
      >
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-gray-400" />
          <span className="font-semibold text-sm">Ver meu histórico</span>
        </div>
        <Badge variant="outline">{myHistory.length} registro(s)</Badge>
      </button>
    </div>
  );
}

