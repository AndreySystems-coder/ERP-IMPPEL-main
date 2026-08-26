import { StatusPill } from "@/components/ui/status-pill";

export function MaterialStatusBadge({ status }: { status: string }) {
  if (status === "retornado") {
    return <StatusPill label="Retornado" variant="success" />;
  }

  if (status === "parcial") {
    return <StatusPill label="Parcial" variant="warning" />;
  }

  return <StatusPill label="Pendente" variant="orange" />;
}
