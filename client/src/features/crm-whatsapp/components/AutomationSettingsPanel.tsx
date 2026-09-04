import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, Check, Copy, KeyRound, Loader2, QrCode, ShieldAlert, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { WhatsAppConnectionPanel } from "@/features/crm-whatsapp/components/WhatsAppConnectionPanel";

type AutomationSettings = {
  n8nWebhookUrl: string | null;
  incomingSecret: string | null;
  whatsappAutoSendEnabled: boolean;
  evolutionApiUrl: string | null;
  evolutionApiKey: string | null;
  evolutionInstanceName: string | null;
};

function CopyField({ label, value }: { label: string; value: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: "Copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-500">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button type="button" variant="outline" size="icon" onClick={copy} className="shrink-0">
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export function AutomationSettingsPanel() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<AutomationSettings>({ queryKey: ["/api/automation-settings"] });
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [freshSecret, setFreshSecret] = useState<string | null>(null);
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [evolutionApiKey, setEvolutionApiKey] = useState("");
  const [evolutionInstanceName, setEvolutionInstanceName] = useState("imppel");

  useEffect(() => {
    if (data) {
      setWebhookUrl(data.n8nWebhookUrl || "");
      setEnabled(data.whatsappAutoSendEnabled);
      setEvolutionApiUrl(data.evolutionApiUrl || "");
      setEvolutionApiKey(data.evolutionApiKey || "");
      setEvolutionInstanceName(data.evolutionInstanceName || "imppel");
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/automation-settings", {
      n8nWebhookUrl: webhookUrl,
      whatsappAutoSendEnabled: enabled,
      evolutionApiUrl,
      evolutionApiKey,
      evolutionInstanceName,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/connection-status"] });
      toast({ title: "Configuração salva." });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/automation-settings/regenerate-secret");
      return res.json();
    },
    onSuccess: (result: { incomingSecret: string }) => {
      setFreshSecret(result.incomingSecret);
      queryClient.invalidateQueries({ queryKey: ["/api/automation-settings"] });
    },
    onError: (e: any) => toast({ title: "Erro ao gerar segredo", description: e.message, variant: "destructive" }),
  });

  const incomingWebhookUrl = `${window.location.origin}/api/webhooks/n8n/whatsapp-status`;

  if (isLoading) {
    return <Card><CardContent className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-violet-600" /> Automação via n8n
          </CardTitle>
          <p className="text-sm text-gray-500">
            O n8n fica no meio entre o ERP e o WhatsApp: o ERP manda a mensagem pro webhook do n8n, o n8n envia de verdade e avisa o ERP de volta.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Ativar mensagem automática ao mudar status de orçamento/obra</p>
              <p className="text-xs text-slate-500">Controla só o envio automático quando um status marcado como "enviar automaticamente" muda. O envio manual (botão WhatsApp nos cards) usa a Evolution API abaixo, direto.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="switch-auto-send" />
          </div>

          <div className="space-y-1.5">
            <Label>1. URL do Webhook do n8n (saída)</Label>
            <Input
              placeholder="https://seu-n8n.exemplo.com/webhook/whatsapp-enviar"
              value={webhookUrl}
              onChange={event => setWebhookUrl(event.target.value)}
              data-testid="input-n8n-webhook-url"
            />
            <p className="text-xs text-gray-400">Cole aqui a URL do webhook (nó "Webhook") do fluxo do n8n que envia a mensagem.</p>
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Salvar configuração
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-5 w-5 text-amber-600" /> 2. Webhook de entrada (o n8n chama o ERP)
          </CardTitle>
          <p className="text-sm text-gray-500">
            Configure no n8n um passo (HTTP Request) que chame essa URL pra confirmar a entrega, ou registrar a resposta do cliente.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="URL do webhook de entrada" value={incomingWebhookUrl} />

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Essa URL só aceita chamadas com o segredo correto (enviado no header <code className="rounded bg-white px-1">x-erp-webhook-secret</code> ou no campo <code className="rounded bg-white px-1">secret</code> do corpo). Sem isso, qualquer pessoa poderia forjar confirmações de envio.
              </p>
            </div>
          </div>

          {freshSecret ? (
            <div className="space-y-2 rounded-lg border-2 border-green-300 bg-green-50 p-3">
              <p className="text-xs font-semibold text-green-800">Copie agora — esse segredo não será mostrado inteiro de novo:</p>
              <CopyField label="Segredo do webhook" value={freshSecret} />
              <Button variant="outline" size="sm" onClick={() => setFreshSecret(null)}>Já copiei, fechar</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Segredo atual: <span className="font-mono">{data?.incomingSecret || "nenhum gerado ainda"}</span>
              </p>
              <Button variant="outline" onClick={() => regenerateMutation.mutate()} disabled={regenerateMutation.isPending} className="shrink-0 gap-2">
                {regenerateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {data?.incomingSecret ? "Gerar novo segredo" : "Gerar segredo"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-5 w-5 text-emerald-600" /> 3. Evolution API (conexão do WhatsApp)
          </CardTitle>
          <p className="text-sm text-gray-500">
            Cole aqui a mesma URL e chave que você já usa no Manager da Evolution API — é o que permite ver o status e reconectar sem sair do ERP.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>URL da Evolution API</Label>
            <Input
              placeholder="https://evolution-api-production-xxxx.up.railway.app"
              value={evolutionApiUrl}
              onChange={event => setEvolutionApiUrl(event.target.value)}
              data-testid="input-evolution-api-url"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Chave da API (apikey)</Label>
            <Input
              type="password"
              placeholder="Cole a chave da instância"
              value={evolutionApiKey}
              onChange={event => setEvolutionApiKey(event.target.value)}
              data-testid="input-evolution-api-key"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nome da instância</Label>
            <Input
              placeholder="imppel"
              value={evolutionInstanceName}
              onChange={event => setEvolutionInstanceName(event.target.value)}
              data-testid="input-evolution-instance-name"
            />
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Salvar configuração
          </Button>
        </CardContent>
      </Card>

      <WhatsAppConnectionPanel configured={Boolean(data?.evolutionApiUrl && data?.evolutionApiKey)} />
    </div>
  );
}
