import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock } from "lucide-react";

interface MaterialFlowStepperProps {
  pendingCount: number;
  returnedCount: number;
  overdueCount?: number;
}

export function MaterialFlowStepper({ pendingCount, returnedCount, overdueCount = 0 }: MaterialFlowStepperProps) {
  const steps = [
    {
      label: "Saída",
      detail: "Foto + assinatura",
      icon: ArrowDownCircle,
      tone: "bg-orange-50 text-orange-700 border-orange-200",
    },
    {
      label: "Em uso",
      detail: overdueCount > 0 ? `${overdueCount} atrasado(s)` : `${pendingCount} pendente(s)`,
      icon: Clock,
      tone: overdueCount > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      label: "Devolução",
      detail: `${returnedCount} concluída(s)`,
      icon: ArrowUpCircle,
      tone: "bg-green-50 text-green-700 border-green-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="material-flow-stepper">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.label} className={`rounded-lg border px-3 py-3 ${step.tone}`}>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80">
                {index === 2 && pendingCount === 0 ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">{step.label}</p>
                <p className="truncate text-xs opacity-80">{step.detail}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
