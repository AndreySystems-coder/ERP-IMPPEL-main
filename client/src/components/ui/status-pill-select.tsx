import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { StatusDot, statusPillVariantStyles, type StatusPillVariant } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

export function StatusPillSelect({
  value,
  options,
  variantForStatus,
  colorForStatus,
  onChange,
  className,
  "data-testid": dataTestId,
}: {
  value: string;
  options: string[];
  variantForStatus: (status: string) => StatusPillVariant;
  /** Cor customizável opcional por status (hex); quando presente, sobrepõe as classes de variante fixas. */
  colorForStatus?: (status: string) => string | undefined;
  onChange: (value: string) => void;
  className?: string;
  "data-testid"?: string;
}) {
  const styles = statusPillVariantStyles[variantForStatus(value)];
  const customColor = colorForStatus?.(value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        data-testid={dataTestId}
        className={cn(
          "h-auto w-auto min-w-0 gap-1.5 rounded-full border-0 px-2.5 py-1 text-xs font-semibold shadow-none focus:ring-2 focus:ring-primary/30 [&>svg]:hidden",
          !customColor && styles.bg,
          !customColor && styles.text,
          className
        )}
        style={customColor ? { backgroundColor: `${customColor}1a`, color: customColor } : undefined}
      >
        {customColor ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: customColor }} /> : <StatusDot variant={variantForStatus(value)} />}
        {value}
      </SelectTrigger>
      <SelectContent>
        {options.map((status) => {
          const optionVariant = variantForStatus(status);
          const optionColor = colorForStatus?.(status);
          return (
            <SelectItem key={status} value={status} className="pl-8">
              <span className="inline-flex items-center gap-2">
                {optionColor ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: optionColor }} /> : <StatusDot variant={optionVariant} pulse={false} />}
                {status}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
