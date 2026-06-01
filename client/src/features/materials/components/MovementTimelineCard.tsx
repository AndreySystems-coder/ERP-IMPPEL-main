import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Camera,
  CheckCircle2,
  Clock,
  FileSignature,
  Package,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MaterialStatusBadge } from "@/features/materials/components/MaterialStatusBadge";
import { daysSince, fmtDate } from "@/features/materials/material-control-utils";
import type { Withdrawal } from "@/features/materials/types";

function conditionLabel(condition?: string) {
  if (condition === "perdido") return "Perdido";
  if (condition === "danificado") return "Danificado";
  return "Bom estado";
}

function conditionClass(condition?: string) {
  if (condition === "perdido") return "border-red-200 bg-red-50 text-red-700";
  if (condition === "danificado") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-green-200 bg-green-50 text-green-700";
}

function ProofPreview({ label, src, kind }: { label: string; src: string | null; kind: "photo" | "signature" }) {
  if (!src) return null;

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50"
    >
      {kind === "photo" ? <Camera className="h-3.5 w-3.5 text-blue-700" /> : <FileSignature className="h-3.5 w-3.5 text-blue-700" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <img src={src} alt={label} className="h-9 w-12 shrink-0 rounded border object-cover" />
    </a>
  );
}

export function MovementTimelineCard({ withdrawal }: { withdrawal: Withdrawal }) {
  const isReturned = withdrawal.status === "retornado";
  const isPartial = withdrawal.status === "parcial";
  const days = daysSince(withdrawal.createdAt);
  const hasIssue = withdrawal.items.some(item => item.condition === "perdido" || item.condition === "danificado");

  return (
    <Card className={`overflow-hidden border-slate-200 ${days > 3 && !isReturned ? "border-red-200" : ""}`} data-testid={`card-history-${withdrawal.id}`}>
      <div className={`h-1 ${isReturned ? "bg-green-600" : isPartial ? "bg-amber-500" : days > 3 ? "bg-red-500" : "bg-orange-500"}`} />
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-slate-900">Retirada #{withdrawal.id}</p>
              <MaterialStatusBadge status={withdrawal.status} />
              {hasIssue && <Badge className="border-amber-200 bg-amber-50 text-amber-700">Atenção na devolução</Badge>}
            </div>
            <div className="grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> {withdrawal.username}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" /> {fmtDate(withdrawal.createdAt)}
              </span>
              {withdrawal.clientName && <span className="sm:col-span-2">Cliente: {withdrawal.clientName}</span>}
              {withdrawal.workOrderId && <span>OS #{withdrawal.workOrderId}</span>}
            </div>
          </div>
          {!isReturned && (
            <Badge className={days > 3 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}>
              <Clock className="mr-1 h-3 w-3" /> {days}d em uso
            </Badge>
          )}
        </div>

        <div className="relative pl-8">
          <div className="absolute left-3 top-5 h-[calc(100%-2.5rem)] w-px bg-slate-200" />

          <div className="relative pb-4">
            <div className="absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">
              <ArrowDownCircle className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
              <p className="text-sm font-bold text-orange-900">Saída registrada</p>
              <p className="mt-0.5 text-xs text-orange-700">{fmtDate(withdrawal.createdAt)}</p>
              <div className="mt-3 grid gap-2">
                {withdrawal.items.map((item, index) => (
                  <div key={`${item.inventoryId}-${index}`} className="rounded-lg border border-white bg-white/80 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{item.productName}</p>
                        <p className="text-xs text-slate-500">Saiu: {item.quantity} {item.unit}</p>
                      </div>
                      {(item.returnedQuantity ?? 0) > 0 && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          Voltou {item.returnedQuantity}
                        </Badge>
                      )}
                    </div>
                    {(item.condition || isReturned || isPartial) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${conditionClass(item.condition)}`}>
                          {conditionLabel(item.condition)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {(withdrawal.withdrawalPhoto || withdrawal.withdrawalSignature || withdrawal.notes) && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ProofPreview label="Foto da saída" src={withdrawal.withdrawalPhoto} kind="photo" />
                  <ProofPreview label="Assinatura da saída" src={withdrawal.withdrawalSignature} kind="signature" />
                  {withdrawal.notes && <p className="rounded-lg bg-white/80 p-2 text-xs text-slate-600 sm:col-span-2">{withdrawal.notes}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div className={`absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full text-white ${isReturned ? "bg-green-600" : "bg-slate-300"}`}>
              {isReturned ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ArrowUpCircle className="h-3.5 w-3.5" />}
            </div>
            <div className={`rounded-xl border p-3 ${isReturned ? "border-green-100 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
              <p className={`text-sm font-bold ${isReturned ? "text-green-900" : "text-slate-500"}`}>
                {isReturned ? "Devolução concluída" : isPartial ? "Devolução parcial" : "Aguardando devolução"}
              </p>
              <p className={`mt-0.5 text-xs ${isReturned ? "text-green-700" : "text-slate-500"}`}>
                {withdrawal.returnedAt ? fmtDate(withdrawal.returnedAt) : "Material ainda vinculado ao funcionário."}
              </p>
              {(withdrawal.returnPhoto || withdrawal.returnSignature || withdrawal.returnNotes) && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ProofPreview label="Foto da devolução" src={withdrawal.returnPhoto} kind="photo" />
                  <ProofPreview label="Assinatura da devolução" src={withdrawal.returnSignature} kind="signature" />
                  {withdrawal.returnNotes && <p className="rounded-lg bg-white/80 p-2 text-xs text-slate-600 sm:col-span-2">{withdrawal.returnNotes}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
