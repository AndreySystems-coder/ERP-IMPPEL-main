import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, QrCode, Wifi, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ConnectionStatus = { state: string };
type QrCodeResponse = { base64: string | null; pairingCode: string | null };

const CONNECTED_STATES = new Set(["open", "connected"]);

export function WhatsAppConnectionPanel({ configured }: { configured: boolean }) {
  const [qrOpen, setQrOpen] = useState(false);

  const { data: status, isLoading: statusLoading } = useQuery<ConnectionStatus>({
    queryKey: ["/api/whatsapp/connection-status"],
    enabled: configured,
    refetchInterval: configured ? 8000 : false,
    retry: false,
  });

  const isConnected = status ? CONNECTED_STATES.has(status.state) : false;

  const { data: qrCode, isLoading: qrLoading, refetch: refetchQr } = useQuery<QrCodeResponse>({
    queryKey: ["/api/whatsapp/qrcode"],
    enabled: configured && qrOpen,
    refetchInterval: qrOpen && !isConnected ? 20000 : false,
    retry: false,
  });

  // Assim que a conexão for detectada, fecha o modal sozinho — não precisa o usuário clicar em nada.
  if (qrOpen && isConnected) setQrOpen(false);

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-5 w-5 text-emerald-600" /> Conexão do WhatsApp
          </CardTitle>
          <p className="text-sm text-gray-500">
            Preencha a URL e a chave da Evolution API acima e salve para poder ver o status e reconectar direto por aqui.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-5 w-5 text-emerald-600" /> Conexão do WhatsApp
        </CardTitle>
        <p className="text-sm text-gray-500">Veja se o número está conectado e reconecte sem precisar abrir o Manager.</p>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        {statusLoading ? (
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Consultando status...
          </span>
        ) : isConnected ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <Wifi className="h-4 w-4" /> Conectado
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-700">
            <WifiOff className="h-4 w-4" /> Desconectado
          </span>
        )}

        {!isConnected && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => { setQrOpen(true); refetchQr(); }}
            data-testid="button-show-qrcode"
          >
            <QrCode className="h-4 w-4" /> Ver QR Code
          </Button>
        )}
      </CardContent>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Escaneie para reconectar</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrLoading || !qrCode?.base64 ? (
              <div className="flex h-64 w-64 items-center justify-center rounded-lg border border-dashed border-slate-200">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <img
                src={qrCode.base64.startsWith("data:") ? qrCode.base64 : `data:image/png;base64,${qrCode.base64}`}
                alt="QR Code do WhatsApp"
                className="h-64 w-64 rounded-lg border border-slate-200"
              />
            )}
            <p className="text-center text-xs text-slate-500">
              Abra o WhatsApp no celular do número da empresa → Aparelhos conectados → Conectar um aparelho, e aponte a câmera. O código se renova sozinho.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
