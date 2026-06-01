import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Info, Library, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CATEGORIES, VARIABLES_HELP } from "@/features/crm-whatsapp/constants";
import type { TemplateForm, WhatsappTemplate } from "@/features/crm-whatsapp/types";
import { emptyTemplateForm } from "@/features/crm-whatsapp/utils";

type TemplateModalProps = {
  open: boolean;
  onClose: () => void;
  template: WhatsappTemplate | null;
};

export function TemplateModal({ open, onClose, template }: TemplateModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<TemplateForm>(emptyTemplateForm());
  const [showVars, setShowVars] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(template ? {
      name: template.name,
      category: template.category,
      message: template.message,
      variables: template.variables || "",
      active: template.active,
    } : emptyTemplateForm());
  }, [template, open]);

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      template
        ? apiRequest("PUT", `/api/whatsapp-templates/${template.id}`, data)
        : apiRequest("POST", "/api/whatsapp-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-templates"] });
      toast({ title: template ? "Template atualizado!" : "Template criado!", description: `"${form.name}" salvo com sucesso.` });
      onClose();
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const insertVar = (variable: string) => setForm(current => ({ ...current, message: current.message + variable }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto rounded-xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5 text-blue-600" />
            {template ? "Editar Template" : "Novo Template de Mensagem"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome do Template *</Label>
              <Input placeholder="Ex: Boas-vindas ao orçamento" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} data-testid="input-tmpl-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={value => setForm(current => ({ ...current, category: value }))}>
                <SelectTrigger data-testid="select-tmpl-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <button type="button" onClick={() => setShowVars(value => !value)} className="flex w-full items-center gap-2 text-left text-sm font-semibold text-blue-700 dark:text-blue-300">
              <Info className="h-4 w-4" /> Variáveis disponíveis, clique para {showVars ? "ocultar" : "ver e inserir"}
            </button>
            {showVars && (
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {VARIABLES_HELP.map(variable => (
                  <button key={variable.var} type="button" onClick={() => insertVar(variable.var)}
                    className="flex items-start gap-2 rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-left transition-colors hover:bg-blue-50 dark:border-blue-700 dark:bg-gray-900 dark:hover:bg-blue-900/30"
                    title={`Inserir ${variable.var}`} data-testid={`btn-var-${variable.var}`}>
                    <code className="shrink-0 font-mono text-xs text-blue-700 dark:text-blue-400">{variable.var}</code>
                    <span className="text-xs text-gray-500">{variable.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Mensagem *</Label>
            <Textarea
              placeholder="Digite a mensagem. Clique nas variáveis acima para inserir automaticamente..."
              value={form.message}
              onChange={event => setForm(current => ({ ...current, message: event.target.value }))}
              rows={7}
              className="resize-none text-sm font-mono"
              data-testid="input-tmpl-message"
            />
            <p className="text-xs text-gray-400">{form.message.length} caracteres</p>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <Label className="text-sm font-medium">Template ativo</Label>
            <Switch checked={form.active} onCheckedChange={value => setForm(current => ({ ...current, active: value }))} data-testid="switch-tmpl-active" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => {
              if (!form.name || !form.message) return toast({ title: "Preencha nome e mensagem", variant: "destructive" });
              saveMutation.mutate(form);
            }}
            disabled={saveMutation.isPending}
            className="bg-blue-700 text-white hover:bg-blue-800"
            data-testid="btn-save-template"
          >
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {template ? "Salvar Alterações" : "Criar Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
