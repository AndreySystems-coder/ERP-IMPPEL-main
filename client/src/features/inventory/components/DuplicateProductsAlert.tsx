import { AlertTriangle } from "lucide-react";

import type { InventoryItem } from "@/features/inventory/types";

export function DuplicateProductsAlert({ duplicateNameGroups }: { duplicateNameGroups: InventoryItem[][] }) {
  if (duplicateNameGroups.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-bold">Possíveis produtos duplicados encontrados</p>
          <p className="mt-0.5 text-xs">
            {duplicateNameGroups.length} grupo(s) têm nomes muito parecidos. Isso pode confundir busca, contagem rápida e lançamentos.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {duplicateNameGroups.slice(0, 4).map(group => (
              <span key={group.map(item => item.id).join("-")} className="rounded-full bg-white px-2 py-1 text-xs font-medium text-amber-800">
                {group.map(item => item.name).join(" / ")}
              </span>
            ))}
            {duplicateNameGroups.length > 4 && (
              <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-amber-800">+{duplicateNameGroups.length - 4}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
