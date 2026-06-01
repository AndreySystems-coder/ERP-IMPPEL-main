import type { FormEvent, ReactNode } from "react";

interface QuoteFormProps {
  onSubmit: (event: FormEvent) => void;
  serviceCount: number;
  totalArea: number;
  totalValue: number;
  primaryClientName?: string;
  children: ReactNode;
}

export function QuoteForm({
  onSubmit,
  serviceCount,
  totalArea,
  totalValue,
  primaryClientName,
  children,
}: QuoteFormProps) {
  const steps = [
    { href: "#quote-basic", label: "Dados" },
    { href: "#quote-clientes", label: "Cliente" },
    { href: "#quote-servicos", label: "Serviços" },
    { href: "#quote-valores", label: "Valores" },
    { href: "#quote-final", label: "Final" },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-5 py-2">
      <div className="sticky top-0 z-10 -mx-1 space-y-3 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-500">Serviços</p>
            <p className="text-sm font-bold text-slate-900">{serviceCount}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-500">Área total</p>
            <p className="text-sm font-bold text-slate-900">{totalArea.toLocaleString("pt-BR")} m²</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-500">Valor</p>
            <p className="text-sm font-bold text-primary">
              {totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-500">Cliente principal</p>
            <p className="truncate text-sm font-bold text-slate-900">{primaryClientName || "Não informado"}</p>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-0.5" aria-label="Etapas do orçamento">
          {steps.map((step) => (
            <a
              key={step.href}
              href={step.href}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              {step.label}
            </a>
          ))}
        </nav>
      </div>

      {children}
    </form>
  );
}
