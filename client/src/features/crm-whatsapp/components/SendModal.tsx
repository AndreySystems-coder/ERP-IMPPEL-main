import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatBrazilPhone } from "@/lib/phone";
import type { SendTarget } from "@/features/crm-whatsapp/types";

type SendModalProps = {
  open: boolean;
  onClose: () => void;
  target: SendTarget | null;
};

export function SendModal({ open, onClose, target }: SendModalProps) {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  useEffect(() => {
    if (open && target) {
      setCustomMessage(target.message);
      setPhone(target.phone ? formatBrazilPhone(target.phone) : "");
    }
    if (!open) {
      setPhone("");
      setCustomMessage("");
    }
  }, [open, target]);

  const sendMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/whatsapp/send-direct", data).then(res => res.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-logs"] }),
  });

  const phoneDigits = phone.replace(/\D/g, "");
  const canSend = phoneDigits.length >= 10 && customMessage.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;
    try {
      const pollOptions = target?.pollOptions || [];
      const result = await sendMutation.mutateAsync({
        phone: phoneDigits,
        message: customMessage,
        flowId: target?.flowId,
        flowName: target?.flowName || "Envio Manual",
        isPoll: pollOptions.length > 0,
        pollOptions,
      });
      toast({
        title: result.ok ? "Mensagem enviada!" : "Falha no envio",
        description: result.ok ? "Enviada direto pelo WhatsApp da empresa." : (result.log?.errorMessage || "Verifique a configuração da Evolution API em Automação."),
        variant: result.ok ? "default" : "destructive",
      });
      if (result.ok) onClose();
    } catch (error: any) {
      toast({ title: "Falha no envio", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto rounded-xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Enviar via WhatsApp
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {target && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:bg-gray-800">
              Template: <span className="font-medium text-gray-700 dark:text-gray-300">{target.flowName || target.templateName}</span>
              {(target.pollOptions?.length || 0) > 0 && (
                <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                  Enquete com {target.pollOptions!.length} opções
                </span>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Número do WhatsApp *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input placeholder="+55 (11) 99999-9999" value={phone} onChange={event => setPhone(formatBrazilPhone(event.target.value))} className="min-h-11 pl-9" data-testid="input-phone" />
            </div>
            <p className="text-xs text-gray-400">Digite DDD + número — o +55 é adicionado automaticamente</p>
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem editável</Label>
            <Textarea value={customMessage} onChange={event => setCustomMessage(event.target.value)} rows={7} className="resize-none text-sm" data-testid="input-send-message" />
            <p className="text-xs text-gray-400">{customMessage.length} caracteres</p>
          </div>
          {canSend && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
              <MessageCircle className="h-4 w-4 shrink-0" />
              A mensagem é enviada direto pelo WhatsApp da empresa — não abre nada no navegador.
            </div>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSend} disabled={!canSend || sendMutation.isPending} className="gap-2 bg-green-600 text-white hover:bg-green-700" data-testid="btn-send-direct">
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            Enviar mensagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
