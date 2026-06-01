import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink, Loader2, MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
      setPhone(target.phone || "");
    }
    if (!open) {
      setPhone("");
      setCustomMessage("");
    }
  }, [open, target]);

  const logMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/whatsapp/log", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-logs"] }),
  });

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneWithCountry = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
  const wameUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(customMessage)}`;
  const canSend = phoneDigits.length >= 10 && customMessage.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;
    let logFailed = false;
    await logMutation
      .mutateAsync({ phone: phoneDigits, message: customMessage, flowId: target?.flowId, flowName: target?.flowName || "Envio Manual" })
      .catch(() => { logFailed = true; });
    window.open(wameUrl, "_blank");
    toast({
      title: "WhatsApp aberto!",
      description: logFailed
        ? "Mensagem preenchida. O envio abriu, mas o histórico não foi registrado."
        : "Mensagem já preenchida. Basta clicar em Enviar.",
    });
    onClose();
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
          {target && <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:bg-gray-800">Template: <span className="font-medium text-gray-700 dark:text-gray-300">{target.flowName || target.templateName}</span></div>}
          <div className="space-y-1.5">
            <Label>Número do WhatsApp *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input placeholder="(11) 99999-9999" value={phone} onChange={event => setPhone(event.target.value)} className="min-h-11 pl-9" data-testid="input-phone" />
            </div>
            <p className="text-xs text-gray-400">DDD + número (+55 adicionado automaticamente)</p>
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem editável</Label>
            <Textarea value={customMessage} onChange={event => setCustomMessage(event.target.value)} rows={7} className="resize-none text-sm" data-testid="input-send-message" />
            <p className="text-xs text-gray-400">{customMessage.length} caracteres</p>
          </div>
          {canSend && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
              <ExternalLink className="h-4 w-4 shrink-0" />
              O WhatsApp abrirá com a mensagem preenchida. Basta clicar em Enviar lá.
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSend} disabled={!canSend || logMutation.isPending} className="gap-2 bg-green-600 text-white hover:bg-green-700" data-testid="btn-send-wame">
            {logMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            Abrir no WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
