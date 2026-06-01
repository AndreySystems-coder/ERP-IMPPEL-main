import { FileText, MessageCircle, Pencil, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TRIGGER_ICON, TRIGGER_LABEL } from "@/features/crm-whatsapp/constants";
import type { ButtonItem } from "@/features/crm-whatsapp/types";
import type { WhatsappFlow } from "@shared/schema";

type FlowCardProps = {
  flow: WhatsappFlow;
  onEdit: () => void;
  onDelete: () => void;
  onSend: () => void;
  onSendButton: (button: ButtonItem) => void;
};

export function FlowCard({ flow, onEdit, onDelete, onSend, onSendButton }: FlowCardProps) {
  const isInitial = flow.trigger === "atendimento_inicial";
  let buttons: ButtonItem[] = [];
  if (flow.buttons) {
    try { buttons = JSON.parse(flow.buttons as string); } catch {}
  }

  return (
    <Card className={`shadow-sm ${isInitial ? "border-2 border-green-400 dark:border-green-600" : "border border-gray-200 dark:border-gray-700"}`} data-testid={`flow-card-${flow.id}`}>
      <CardHeader className="px-4 pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-xl">{TRIGGER_ICON[flow.trigger] || "💬"}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold">{flow.name}</h3>
                {isInitial && <Badge className="border-0 bg-green-600 text-xs text-white">Principal</Badge>}
                <Badge variant="outline" className={`text-xs ${flow.active ? "border-green-400 text-green-600" : "text-gray-400"}`}>{flow.active ? "Ativo" : "Inativo"}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">{TRIGGER_LABEL[flow.trigger] || flow.trigger}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit} className="h-9 w-9 p-0" data-testid={`btn-edit-flow-${flow.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-red-400 hover:text-red-600" data-testid={`btn-delete-flow-${flow.id}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[calc(100vw-1.5rem)] rounded-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover fluxo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O fluxo "{flow.name}" será removido da automação do WhatsApp. Essa ação não altera envios já registrados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-red-600 text-white hover:bg-red-700">
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm leading-relaxed text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 whitespace-pre-wrap">{flow.message}</div>
        {buttons.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Opções do cliente:</p>
            {buttons.map((button, index) => (
              <div key={button.id} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700" data-testid={`btn-option-${flow.id}-${index}`}>
                <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 dark:bg-gray-800">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{button.text}</span>
                  <Button size="sm" variant="ghost" onClick={() => onSendButton(button)} className="h-8 gap-1 text-xs text-green-600 hover:bg-green-50" data-testid={`btn-send-response-${flow.id}-${index}`}>
                    <MessageCircle className="h-3 w-3" />Responder
                  </Button>
                </div>
                {button.responseMessage && <div className="line-clamp-2 border-t border-gray-100 bg-green-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-green-900/10 dark:text-gray-400">→ {button.responseMessage}</div>}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div>{flow.includePdf && <Badge variant="outline" className="gap-1 text-xs"><FileText className="h-3 w-3" />PDF</Badge>}</div>
          <Button size="sm" onClick={onSend} className="min-h-9 gap-2 bg-green-600 text-white hover:bg-green-700" data-testid={`btn-send-flow-${flow.id}`}>
            <MessageCircle className="h-3.5 w-3.5" />Enviar Mensagem
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
