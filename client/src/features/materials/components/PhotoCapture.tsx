import { useRef } from "react";
import { Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function PhotoCapture({
  onPhoto,
  value,
  label,
}: {
  onPhoto: (data: string) => void;
  value: string | null;
  label: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => onPhoto(loadEvent.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} <span className="text-red-500">*</span>
      </Label>
      <p className="text-xs text-slate-500">Use a câmera traseira quando possível e enquadre todos os materiais.</p>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      {value ? (
        <div className="space-y-2">
          <div className="relative">
          <img src={value} alt="Foto dos materiais" className="max-h-48 w-full rounded-lg border object-cover" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute right-2 top-2 bg-white/95"
            onClick={() => fileRef.current?.click()}
            data-testid="button-retake-photo"
          >
            <Camera className="mr-1 h-3 w-3" /> Trocar
          </Button>
          </div>
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
            Foto anexada. Você pode trocar antes de confirmar.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-44 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
          data-testid="button-capture-photo"
        >
          <Camera className="h-10 w-10" />
          <span className="text-sm font-semibold">Registrar foto</span>
          <span className="text-xs">Câmera ou galeria</span>
        </button>
      )}
    </div>
  );
}
