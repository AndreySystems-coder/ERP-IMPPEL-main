import { cn } from "@/lib/utils";

export type StatusPillVariant = "success" | "warning" | "error" | "info" | "primary" | "purple" | "orange" | "neutral";

export const statusPillVariantStyles: Record<StatusPillVariant, { dot: string; bg: string; text: string }> = {
  success: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  error: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
  info: { dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
  primary: { dot: "bg-primary", bg: "bg-primary/10", text: "text-primary" },
  purple: { dot: "bg-purple-500", bg: "bg-purple-50", text: "text-purple-700" },
  orange: { dot: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-700" },
  neutral: { dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-600" },
};

const variantStyles = statusPillVariantStyles;

export function StatusDot({ variant = "neutral", pulse = true, className }: { variant?: StatusPillVariant; pulse?: boolean; className?: string }) {
  const styles = variantStyles[variant];
  return (
    <span className={cn("relative flex h-1.5 w-1.5 shrink-0", className)}>
      {pulse && (
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", styles.dot)} />
      )}
      <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", styles.dot)} />
    </span>
  );
}

export function StatusPill({
  label,
  variant = "neutral",
  className,
  pulse = true,
}: {
  label: string;
  variant?: StatusPillVariant;
  className?: string;
  pulse?: boolean;
}) {
  const styles = variantStyles[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        styles.bg,
        styles.text,
        className
      )}
    >
      <StatusDot variant={variant} pulse={pulse} />
      {label}
    </span>
  );
}
