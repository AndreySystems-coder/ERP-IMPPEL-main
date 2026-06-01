import { useRef, useState } from "react";
import { Pen, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function SignaturePad({ onSave, label }: { onSave: (data: string) => void; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (event: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in event) {
      return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
    }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pos = getPos(event, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const move = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pos = getPos(event, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1E3A8A";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasSignature(true);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-slate-500">Assine com o dedo ou caneta touch e confirme para salvar.</p>
      <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={() => (drawing.current = false)}
          onMouseLeave={() => (drawing.current = false)}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={() => (drawing.current = false)}
          data-testid="canvas-signature"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} className="h-10" data-testid="button-clear-signature">
          <Trash2 className="mr-1 h-3 w-3" /> Limpar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (!hasSignature || !canvasRef.current) return;
            onSave(canvasRef.current.toDataURL("image/png"));
          }}
          disabled={!hasSignature}
          className="h-10 bg-blue-900 text-white hover:bg-blue-800"
          data-testid="button-save-signature"
        >
          <Pen className="mr-1 h-3 w-3" /> Usar assinatura
        </Button>
      </div>
    </div>
  );
}
