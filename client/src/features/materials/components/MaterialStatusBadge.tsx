import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function MaterialStatusBadge({ status }: { status: string }) {
  if (status === "retornado") {
    return (
      <Badge className="border-green-200 bg-green-100 text-green-800">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Retornado
      </Badge>
    );
  }

  if (status === "parcial") {
    return (
      <Badge className="border-yellow-200 bg-yellow-100 text-yellow-800">
        <AlertTriangle className="mr-1 h-3 w-3" /> Parcial
      </Badge>
    );
  }

  return (
    <Badge className="border-orange-200 bg-orange-100 text-orange-800">
      <Clock className="mr-1 h-3 w-3" /> Pendente
    </Badge>
  );
}
