import { Layers, Plus, X } from "lucide-react";

export interface QuoteServiceItemForm {
  _id: string;
  lugar?: string;
  name: string;
  description?: string;
  area: string;
  unitPrice: string;
  total: number;
}

interface QuoteServiceItemsProps {
  items: QuoteServiceItemForm[];
  services: any[];
  inventoryItems: any[];
  totalValue: number;
  privacyMaskEnabled?: boolean;
  maskText?: (value: unknown, fallback?: string) => string;
  maskMoney?: (value: unknown) => string;
  maskNumber?: (value: unknown, suffix?: string) => string;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, field: "name" | "area" | "unitPrice", value: string) => void;
  onUpdateDescription: (id: string, description: string) => void;
  onUpdateLugar: (id: string, lugar: string) => void;
  onSelectService: (id: string, serviceName: string) => void;
}

function parseMaterials(service: any): any[] {
  if (!service?.serviceMaterials) return [];
  try {
    return JSON.parse(service.serviceMaterials);
  } catch {
    return [];
  }
}

function getMaterialQuantity(material: any, area: number) {
  if (material.unit === "per_kg") {
    return Math.ceil((area * (Number(material.kilosPerM2) || 0)) / (Number(material.weightPerUnit) || 1));
  }
  if (material.unit === "per_m2") {
    return Math.ceil(material.quantity * area);
  }
  return Math.ceil(material.quantity);
}

export function QuoteServiceItems({
  items,
  services,
  inventoryItems,
  totalValue,
  privacyMaskEnabled = false,
  maskText = (value, fallback = "—") => String(value ?? "") || fallback,
  maskMoney = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  maskNumber = (value, suffix = "") => `${value ?? 0}${suffix ? ` ${suffix}` : ""}`,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onUpdateDescription,
  onUpdateLugar,
  onSelectService,
}: QuoteServiceItemsProps) {
  const consolidatedMap: Record<string, { qty: number; invUnit: string; inventoryId: number }> = {};

  for (const item of items) {
    const service = services.find((candidate) => candidate.name === item.name);
    const materials = parseMaterials(service);
    const area = Number(item.area) || 0;

    for (const material of materials) {
      const qty =
        material.unit === "per_kg"
          ? Math.ceil((area * (Number(material.kilosPerM2) || 0)) / (Number(material.weightPerUnit) || 1))
          : material.unit === "per_m2"
            ? material.quantity * area
            : material.quantity;
      const inventoryItem = inventoryItems.find((candidate) => candidate.id === material.inventoryId);
      const invUnit = inventoryItem?.unit || "unid";

      if (consolidatedMap[material.name]) {
        consolidatedMap[material.name].qty += qty;
      } else {
        consolidatedMap[material.name] = { qty, invUnit, inventoryId: material.inventoryId };
      }
    }
  }

  const materialEntries = Object.entries(consolidatedMap);
  const availableCount = materialEntries.filter(([, value]) => {
    const item = inventoryItems.find((candidate) => candidate.id === value.inventoryId);
    return item && item.quantity >= Math.ceil(value.qty);
  }).length;
  const missingCount = materialEntries.length - availableCount;

  return (
    <section id="quote-servicos" className="scroll-mt-28 space-y-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Layers className="h-4 w-4 text-primary" /> Serviços *
        </label>
        <button
          type="button"
          onClick={onAddItem}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 sm:h-auto sm:py-2"
          data-testid="button-add-service-item"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar serviço
        </button>
      </div>

      <div className="space-y-3 lg:hidden">
        {items.map((item, index) => {
          const service = services.find((candidate) => candidate.name === item.name);
          const materials = parseMaterials(service);
          const area = Number(item.area) || 0;

          return (
            <div key={item._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase text-slate-500">Serviço {index + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => onRemoveItem(item._id)} className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <input value={item.lugar || ""} onChange={(event) => onUpdateLugar(item._id, event.target.value)} placeholder="Lugar: laje, piscina, banheiro..." className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" data-testid={`input-lugar-item-${index}`} />
                <select value={item.name} onChange={(event) => onSelectService(item._id, event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" data-testid={`select-service-item-${index}`}>
                  <option value="">Selecionar serviço...</option>
                  {services.map((serviceOption) => (
                    <option key={serviceOption.id} value={serviceOption.name}>{serviceOption.name}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="0.01" min="0" value={item.area} onChange={(event) => onUpdateItem(item._id, "area", event.target.value)} placeholder="Área m²" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" data-testid={`input-area-item-${index}`} />
                  <input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(event) => onUpdateItem(item._id, "unitPrice", event.target.value)} placeholder="R$/m²" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" data-testid={`input-price-item-${index}`} />
                </div>
                <textarea rows={2} value={item.description || ""} onChange={(event) => onUpdateDescription(item._id, event.target.value)} placeholder="Descrição técnica para o PDF..." className="resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" data-testid={`input-item-description-${index}`} />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
                <span className="text-xs font-semibold text-slate-500">Total do serviço</span>
                <span className="font-bold text-primary">{maskMoney(item.total)}</span>
              </div>
              {materials.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {materials.map((material, materialIndex) => (
                    <span key={materialIndex} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      {maskText(material.name, "Material ••••")}: {maskNumber(getMaterialQuantity(material, area))}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden rounded-lg border border-slate-200 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="w-[18%] px-3 py-2 text-left font-semibold text-slate-600">Lugar</th>
                <th className="w-[36%] px-3 py-2 text-left font-semibold text-slate-600">Serviço</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Área (m²)</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">R$/m²</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Total</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.flatMap((item, index) => {
                const service = services.find((candidate) => candidate.name === item.name);
                const materials = parseMaterials(service);
                const area = Number(item.area) || 0;

                return [
                  <tr key={`svc-${item._id}`} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-2 py-1.5"><input value={item.lugar || ""} onChange={(event) => onUpdateLugar(item._id, event.target.value)} placeholder="Ex: Piscina" className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium focus:border-primary focus:outline-none" data-testid={`input-lugar-item-${index}`} /></td>
                    <td className="px-2 py-1.5"><select value={item.name} onChange={(event) => onSelectService(item._id, event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none" data-testid={`select-service-item-${index}`}><option value="">Selecionar...</option>{services.map((serviceOption) => <option key={serviceOption.id} value={serviceOption.name}>{serviceOption.name}</option>)}</select></td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" min="0" value={item.area} onChange={(event) => onUpdateItem(item._id, "area", event.target.value)} placeholder="0.00" className="ml-auto block w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm focus:border-primary focus:outline-none" data-testid={`input-area-item-${index}`} /></td>
                    <td className="px-2 py-1.5"><input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(event) => onUpdateItem(item._id, "unitPrice", event.target.value)} placeholder="0.00" className="ml-auto block w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm focus:border-primary focus:outline-none" data-testid={`input-price-item-${index}`} /></td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right font-bold text-slate-900">{maskMoney(item.total)}</td>
                    <td className="px-1 py-1.5">{items.length > 1 && <button type="button" onClick={() => onRemoveItem(item._id)} className="rounded p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500" data-testid={`button-remove-item-${index}`}><X className="h-3.5 w-3.5" /></button>}</td>
                  </tr>,
                  <tr key={`desc-${item._id}`} className="border-0 bg-slate-50/70">
                    <td colSpan={6} className="px-3 pb-2 pt-0"><textarea rows={2} value={item.description || ""} onChange={(event) => onUpdateDescription(item._id, event.target.value)} placeholder="Descrição técnica do serviço (aparece no PDF)..." className="w-full resize-none rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-xs italic text-slate-600 transition-all focus:border-primary focus:outline-none" data-testid={`input-item-description-${index}`} /></td>
                  </tr>,
                  materials.length > 0 ? (
                    <tr key={`mats-${item._id}`} className="border-0 bg-emerald-50/50">
                      <td colSpan={6} className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {materials.map((material, materialIndex) => (
                            <span key={materialIndex} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800" data-testid={`mat-badge-${index}-${materialIndex}`}>
                              {maskText(material.name, "Material ••••")}: {maskNumber(getMaterialQuantity(material, area))}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : null,
                ];
              })}
            </tbody>
            <tfoot>
              <tr className="bg-primary text-white">
                <td colSpan={4} className="px-3 py-2.5 text-sm font-bold">TOTAL GERAL</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-base font-bold">
                  {maskMoney(totalValue)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {materialEntries.length > 0 && (
        <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4" data-testid="consumo-estimado-panel">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-emerald-900">Consumo estimado de materiais</p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              {availableCount > 0 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">{availableCount} disponível(is)</span>}
              {missingCount > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">{missingCount} em falta</span>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {materialEntries.map(([name, value]) => {
              const ceiled = Math.ceil(value.qty);
              const inventoryItem = inventoryItems.find((candidate) => candidate.id === value.inventoryId);
              const inStock = inventoryItem ? inventoryItem.quantity >= ceiled : false;
              return (
                <div key={name} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${inStock ? "border-emerald-100 bg-white" : "border-red-200 bg-red-50"}`} data-testid={`consumo-item-${value.inventoryId}`}>
                  <span className="truncate font-medium text-slate-700">{maskText(name, "Material ••••")}</span>
                  <span className={`ml-2 shrink-0 font-bold ${inStock ? "text-emerald-700" : "text-red-700"}`}>{maskNumber(ceiled, privacyMaskEnabled ? "" : value.invUnit)}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-emerald-600">Quantidades arredondadas para cima. Esta área não aparece no PDF do cliente.</p>
        </div>
      )}
    </section>
  );
}
