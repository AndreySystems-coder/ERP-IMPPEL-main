import { CheckCircle2, Copy, MessageCircle, Pencil, Trash2 } from "lucide-react";

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
import { CATEGORY_MAP } from "@/features/crm-whatsapp/constants";
import type { WhatsappTemplate } from "@/features/crm-whatsapp/types";

type TemplateCardProps = {
  template: WhatsappTemplate;
  copied: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onSend: () => void;
};

export function TemplateCard({ template, copied, onEdit, onDelete, onCopy, onSend }: TemplateCardProps) {
  const category = CATEGORY_MAP[template.category] || CATEGORY_MAP.geral;

  return (
    <Card className={`border shadow-sm transition-all ${template.active ? "border-gray-200 dark:border-gray-700" : "border-dashed border-gray-300 opacity-60 dark:border-gray-600"}`} data-testid={`template-card-${template.id}`}>
      <CardHeader className="px-4 pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{template.name}</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${category.color}`}>{category.label}</span>
              {!template.active && <Badge variant="outline" className="text-xs text-gray-400">Inativo</Badge>}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit} className="h-9 w-9 p-0" data-testid={`btn-edit-template-${template.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-red-400 hover:text-red-600" data-testid={`btn-delete-template-${template.id}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[calc(100vw-1.5rem)] rounded-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover template?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O template "{template.name}" será removido da biblioteca. Essa ação não altera históricos já registrados.
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
        <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm leading-relaxed text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 whitespace-pre-wrap">
          {template.message}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button size="sm" variant="outline" onClick={onCopy} className="h-9 gap-1.5 text-xs" data-testid={`btn-copy-template-${template.id}`}>
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado!" : "Copiar texto"}
          </Button>
          <Button size="sm" onClick={onSend} className="h-9 gap-1.5 bg-green-600 text-xs text-white hover:bg-green-700" data-testid={`btn-send-template-${template.id}`}>
            <MessageCircle className="h-3.5 w-3.5" />Enviar via WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
