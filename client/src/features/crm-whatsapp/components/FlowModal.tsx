import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TRIGGER_ICON, TRIGGER_OPTIONS } from "@/features/crm-whatsapp/constants";
import type { ButtonItem, FlowForm } from "@/features/crm-whatsapp/types";
import { emptyFlowForm } from "@/features/crm-whatsapp/utils";
import type { WhatsappFlow } from "@shared/schema";

type FlowModalProps = {
  open: boolean;
  onClose: () => void;
  flow: WhatsappFlow | null;
};

export function FlowModal({ open, onClose, flow }: FlowModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FlowForm>(emptyFlowForm());

  useEffect(() => {
    if (!open) return;
    if (flow) {
      let parsedButtons: ButtonItem[] = [];
      if (flow.buttons) {
        try { parsedButtons = JSON.parse(flow.buttons as string); } catch {}
      }
      setForm({
        name: flow.name,
        trigger: flow.trigger,
        message: flow.message,
        messageType: (flow.messageType as "text" | "buttons") || "text",
        buttons: parsedButtons,
        includePdf: !!flow.includePdf,
        active: !!flow.active,
        sortOrder: flow.sortOrder || 0,
      });
      return;
    }
    setForm(emptyFlowForm());
  }, [flow, open]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => flow ? apiRequest("PUT", `/api/whatsapp-flows/${flow.id}`, data) : apiRequest("POST", "/api/whatsapp-flows", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-flows"] });
      toast({ title: flow ? "Fluxo atualizado!" : "Fluxo criado!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const setField = <K extends keyof FlowForm>(key: K, value: FlowForm[K]) => setForm(current => ({ ...current, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto rounded-xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-green-600" />
            {flow ? "Editar Fluxo" : "Novo Fluxo WhatsApp"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Boas-vindas" value={form.name} onChange={event => setField("name", event.target.value)} data-testid="input-flow-name" />
            </div>
            <div className="space-y-1">
              <Label>Gatilho</Label>
              <Select value={form.trigger} onValueChange={value => setField("trigger", value)}>
                <SelectTrigger data-testid="select-trigger"><SelectValue /></SelectTrigger>
                <SelectContent>{TRIGGER_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{TRIGGER_ICON[option.value]} {option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Mensagem Principal *</Label>
            <Textarea placeholder="Mensagem enviada ao cliente..." value={form.message} onChange={event => setField("message", event.target.value)} rows={5} className="resize-none text-sm" data-testid="input-flow-message" />
          </div>

          <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Label className="text-sm font-medium">Tipo de mensagem</Label>
              <p className="mt-0.5 text-xs text-gray-400">Com opções exibe botões de resposta</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${form.messageType === "text" ? "font-semibold text-blue-600" : "text-gray-400"}`}>Texto</span>
              <Switch checked={form.messageType === "buttons"} onCheckedChange={value => setField("messageType", value ? "buttons" : "text")} data-testid="switch-type" />
              <span className={`text-sm ${form.messageType === "buttons" ? "font-semibold text-green-600" : "text-gray-400"}`}>Com Opções</span>
            </div>
          </div>

          {form.messageType === "buttons" && <ButtonEditor buttons={form.buttons} onChange={buttons => setField("buttons", buttons)} />}

          <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <div>
              <Label className="text-sm font-medium">Incluir PDF do Orçamento</Label>
              <p className="text-xs text-gray-400">Anexar PDF quando disponível</p>
            </div>
            <Switch checked={form.includePdf} onCheckedChange={value => setField("includePdf", value)} data-testid="switch-pdf" />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <Label className="text-sm font-medium">Fluxo ativo</Label>
            <Switch checked={form.active} onCheckedChange={value => setField("active", value)} data-testid="switch-active" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            if (!form.name || !form.message) return toast({ title: "Preencha nome e mensagem", variant: "destructive" });
            if (form.messageType === "buttons" && form.buttons.length === 0) return toast({ title: "Adicione pelo menos 1 opção", variant: "destructive" });
            saveMutation.mutate({ ...form, buttons: form.messageType === "buttons" ? JSON.stringify(form.buttons) : null });
          }} disabled={saveMutation.isPending} className="bg-green-600 text-white hover:bg-green-700" data-testid="btn-save-flow">
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {flow ? "Salvar" : "Criar Fluxo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ButtonEditor({ buttons, onChange }: { buttons: ButtonItem[]; onChange: (buttons: ButtonItem[]) => void }) {
  const add = () => {
    if (buttons.length >= 4) return;
    onChange([...buttons, { id: String(Date.now()), text: "", responseMessage: "" }]);
  };
  const remove = (index: number) => onChange(buttons.filter((_, itemIndex) => itemIndex !== index));
  const update = (index: number, field: keyof ButtonItem, value: string) => {
    const copy = [...buttons];
    copy[index] = { ...copy[index], [field]: value };
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      {buttons.map((button, index) => (
        <div key={button.id} className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Opção {index + 1}</span>
            <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600" data-testid={`btn-remove-${index}`}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <Input placeholder="Texto da opção (ex: 📋 Quero um orçamento)" value={button.text} onChange={event => update(index, "text", event.target.value)} className="text-sm" data-testid={`btn-text-${index}`} />
          <Textarea placeholder="Resposta automática ao selecionar esta opção..." value={button.responseMessage} onChange={event => update(index, "responseMessage", event.target.value)} rows={2} className="resize-none text-sm" data-testid={`btn-response-${index}`} />
        </div>
      ))}
      {buttons.length < 4 && (
        <Button type="button" variant="outline" size="sm" onClick={add} className="w-full text-xs" data-testid="btn-add-option">
          <Plus className="mr-1 h-3 w-3" /> Adicionar Opção ({buttons.length}/4)
        </Button>
      )}
    </div>
  );
}
