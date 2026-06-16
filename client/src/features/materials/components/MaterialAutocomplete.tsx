import { useEffect, useMemo, useState } from "react";
import { Package, Search, X } from "lucide-react";

import type { InventoryItem } from "@/features/materials/types";
import { asArray } from "@/lib/safeData";

export function MaterialAutocomplete({
  inventory,
  selectedId,
  onSelect,
}: {
  inventory: InventoryItem[];
  selectedId: string;
  onSelect: (item: InventoryItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const inventoryList = asArray<InventoryItem>(inventory);
  const selectedItem = inventoryList.find((item) => item.id === Number(selectedId));

  useEffect(() => {
    if (selectedItem) setSearch(selectedItem.name);
  }, [selectedItem]);

  const filtered = useMemo(
    () => inventoryList.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()) && search.length > 0).slice(0, 8),
    [inventoryList, search],
  );

  if (selectedId && selectedItem) {
    return (
      <div className="flex items-center gap-2 rounded-xl border-2 border-green-400 bg-green-50 px-3 py-3">
        <Package className="h-4 w-4 shrink-0 text-green-600" />
        <span className="flex-1 truncate text-sm font-semibold text-slate-800">{selectedItem.name}</span>
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
          {selectedItem.quantity} {selectedItem.unit || "unid"}
        </span>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            onSelect({ id: 0, name: "", unit: "", quantity: 0 });
          }}
          className="ml-1 rounded-full p-1 text-slate-400 transition-colors hover:bg-white hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-border bg-white px-3 py-2.5 transition-all focus-within:border-primary">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(event.target.value.length > 0);
          }}
          onFocus={() => {
            if (search.length > 0) setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar material no estoque..."
          className="flex-1 border-none bg-transparent text-sm outline-none"
          data-testid="input-material-search"
        />
      </div>
      {!open && search.length === 0 && (
        <p className="mt-1 text-xs text-slate-400">Digite parte do nome para localizar o material disponível.</p>
      )}

      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border-2 border-primary/30 bg-white shadow-lg">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={() => {
                onSelect(item);
                setSearch(item.name);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 text-left transition-colors last:border-0 hover:bg-primary/5"
              data-testid={`option-material-${item.id}`}
            >
              <span className="truncate text-sm font-medium text-slate-900">{item.name}</span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {item.quantity} {item.unit || "unid"}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && search.length > 0 && filtered.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border-2 border-amber-200 bg-white px-3 py-3 text-sm text-slate-400 shadow-lg">
          Nenhum material com estoque disponível para "{search}"
        </div>
      )}
    </div>
  );
}
