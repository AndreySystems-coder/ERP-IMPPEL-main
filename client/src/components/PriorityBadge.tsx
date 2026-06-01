import React from "react";
import { TrendingUp, Zap, AlertTriangle } from "lucide-react";

interface PriorityBadgeProps {
  priority: "ALTA" | "MÉDIA" | "BAIXA";
  score: number;
  className?: string;
}

export function PriorityBadge({ priority, score, className = "" }: PriorityBadgeProps) {
  const styles = {
    ALTA: "bg-emerald-100 text-emerald-700 border border-emerald-300",
    MÉDIA: "bg-amber-100 text-amber-700 border border-amber-300",
    BAIXA: "bg-red-100 text-red-700 border border-red-300",
  };

  const icons = {
    ALTA: <TrendingUp className="w-3.5 h-3.5" />,
    MÉDIA: <Zap className="w-3.5 h-3.5" />,
    BAIXA: <AlertTriangle className="w-3.5 h-3.5" />,
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${styles[priority]} ${className}`}>
      {icons[priority]}
      <span className="font-semibold text-sm">{priority}</span>
      <span className="text-xs opacity-75">({score.toFixed(1)})</span>
    </div>
  );
}
