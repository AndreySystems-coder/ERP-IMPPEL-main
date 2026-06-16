import { Eye, EyeOff } from "lucide-react";

interface PrivacyToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function PrivacyToggle({ enabled, onToggle }: PrivacyToggleProps) {
  const Icon = enabled ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors ${
        enabled
          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
      title={enabled ? "Mostrar dados reais" : "Ocultar dados sensíveis"}
      data-testid="button-privacy-mask"
      aria-pressed={enabled}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{enabled ? "Dados ocultos" : "Mostrar dados"}</span>
    </button>
  );
}
