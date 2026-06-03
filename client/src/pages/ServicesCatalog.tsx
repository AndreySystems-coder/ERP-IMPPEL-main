import React, { useMemo, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useServices, useCreateService, useUpdateService, useDeleteService } from "@/hooks/use-services";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, PencilLine, Trash2, BookOpen, Package, X, FlaskConical, AlertTriangle } from "lucide-react";
import { useUser } from "@/hooks/use-auth";
import type { InsertService } from "@shared/schema";

interface ServiceMaterial {
  inventoryId: number;
  name: string;
  unit: "per_m2" | "per_kg" | "fixed";
  quantity: number;
  kilosPerM2?: number;
  weightPerUnit?: number;
}

function calcMaterialQty(mat: ServiceMaterial, area: number): number {
  if (mat.unit === "per_kg") {
    const kpm2 = Number(mat.kilosPerM2) || 0;
    const wpu = Number(mat.weightPerUnit) || 1;
    return Math.ceil((area * kpm2) / wpu);
  }
  if (mat.unit === "per_m2") return Math.ceil(Number(mat.quantity) * area);
  return Math.ceil(Number(mat.quantity));
}

export default function ServicesCatalog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentUser } = useUser();
  const isAdmin = (currentUser as any)?.role === "admin";
  const { data: services = [], isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const { data: inventoryItems = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [materialConsumptionPerM2, setMaterialConsumptionPerM2] = useState("");
  const [laborCostPerM2, setLaborCostPerM2] = useState("");
  const [transportCostPerM2, setTransportCostPerM2] = useState("");
  const [serviceMaterials, setServiceMaterials] = useState<ServiceMaterial[]>([]);

  const filtered = useMemo(
    () => (services as any[]).filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase())),
    [search, services]
  );

  const resetForm = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setPricePerUnit("");
    setMaterialConsumptionPerM2("");
    setLaborCostPerM2("");
    setTransportCostPerM2("");
    setServiceMaterials([]);
  };

  const openNew = () => { resetForm(); setIsOpen(true); };

  const openEdit = (service: any) => {
    setEditing(service);
    setName(service.name || "");
    setDescription(service.description || "");
    setPricePerUnit(service.pricePerUnit != null ? String(service.pricePerUnit) : "");
    setMaterialConsumptionPerM2(service.materialConsumptionPerM2 != null ? String(service.materialConsumptionPerM2) : "");
    setLaborCostPerM2(service.laborCostPerM2 != null ? String(service.laborCostPerM2) : "");
    setTransportCostPerM2(service.transportCostPerM2 != null ? String(service.transportCostPerM2) : "");
    if (service.serviceMaterials) {
      try { setServiceMaterials(JSON.parse(service.serviceMaterials)); } catch { setServiceMaterials([]); }
    } else {
      setServiceMaterials([]);
    }
    setIsOpen(true);
  };

  const addMaterial = () => {
    setServiceMaterials(prev => [...prev, { inventoryId: 0, name: "", unit: "per_m2", quantity: 0 }]);
  };

  const updateMaterial = (idx: number, field: keyof ServiceMaterial, value: any) => {
    setServiceMaterials(prev => prev.map((m, i) => {
      if (i !== idx) return m;
      if (field === "inventoryId") {
        const item = (inventoryItems as any[]).find((it: any) => it.id === Number(value));
        return { ...m, inventoryId: Number(value), name: item?.name || m.name };
      }
      return { ...m, [field]: value };
    }));
  };

  const removeMaterial = (idx: number) => {
    setServiceMaterials(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const validMaterials = serviceMaterials.filter(m =>
      m.inventoryId > 0 && (
        m.unit === "per_kg"
          ? (Number(m.kilosPerM2) > 0 && Number(m.weightPerUnit) > 0)
          : m.quantity > 0
      )
    );

    const payload: InsertService & { serviceMaterials?: string } = {
      name: name.trim(),
      description: description.trim() || undefined,
      pricePerUnit: Number(pricePerUnit) || 0,
      materialConsumptionPerM2: Number(materialConsumptionPerM2) || 0,
      laborCostPerM2: Number(laborCostPerM2) || 0,
      transportCostPerM2: Number(transportCostPerM2) || 0,
      defaultMargin: editing?.defaultMargin ?? 0.4,
      serviceMaterials: validMaterials.length > 0 ? JSON.stringify(validMaterials) : undefined,
    };

    try {
      if (editing) {
        await updateService.mutateAsync({ id: editing.id, ...payload });
        toast({ title: "Serviço atualizado com sucesso!" });
      } else {
        await createService.mutateAsync(payload);
        toast({ title: "Serviço criado com sucesso!" });
      }
      setIsOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: `Erro ao salvar: ${err.message || "Tente novamente."}`, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, serviceName: string) => {
    if (!confirm(`Excluir "${serviceName}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteService.mutateAsync(id);
      toast({ title: "Serviço excluído." });
    } catch (err: any) {
      toast({ title: `Erro ao excluir: ${err.message || "Tente novamente."}`, variant: "destructive" });
    }
  };

  const isPending = createService.isPending || updateService.isPending;

  const validMaterialsForPreview = serviceMaterials.filter(m =>
    m.inventoryId > 0 && (
      m.unit === "per_kg"
        ? (Number(m.kilosPerM2) > 0 && Number(m.weightPerUnit) > 0)
        : m.quantity > 0
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            Catálogo de Serviços
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie serviços, descrições, preços e materiais necessários por obra.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNew} data-testid="button-new-service">
            <Plus className="w-4 h-4 mr-2" /> Novo Serviço
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar serviço..."
              className="w-full bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
              data-testid="input-search-service"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum serviço encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-3 font-semibold text-slate-600 uppercase text-xs tracking-wider">Serviço</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-600 uppercase text-xs tracking-wider">Descrição</th>
                    <th className="text-right py-3 px-3 font-semibold text-slate-600 uppercase text-xs tracking-wider">R$/m²</th>
                    <th className="text-right py-3 px-3 font-semibold text-slate-600 uppercase text-xs tracking-wider">Mão obra/m²</th>
                    <th className="text-center py-3 px-3 font-semibold text-slate-600 uppercase text-xs tracking-wider">Materiais</th>
                    <th className="py-3 px-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((service: any) => {
                    let mats: ServiceMaterial[] = [];
                    if (service.serviceMaterials) {
                      try { mats = JSON.parse(service.serviceMaterials); } catch {}
                    }
                    return (
                      <tr key={service.id} className="hover:bg-slate-50 transition-colors" data-testid={`row-service-${service.id}`}>
                        <td className="py-3 px-3 font-semibold text-slate-900 max-w-[180px]">
                          <span className="line-clamp-2">{service.name}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-[220px]">
                          <span className="line-clamp-2 text-xs">{service.description || "—"}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-primary whitespace-nowrap">
                          R$ {Number(service.pricePerUnit || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 whitespace-nowrap">
                          R$ {Number(service.laborCostPerM2 || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {mats.length > 0 ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <FlaskConical className="w-3 h-3" /> {mats.length} material(is)
                              </span>
                              <span className="text-xs text-slate-400">{mats.map(m => m.name).slice(0, 2).join(", ")}{mats.length > 2 ? "..." : ""}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(service)} data-testid={`button-edit-service-${service.id}`}>
                              <PencilLine className="w-4 h-4 text-slate-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(service.id, service.name)} data-testid={`button-delete-service-${service.id}`}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); resetForm(); }}
        title={editing ? "Editar Serviço" : "Novo Serviço"}
        size="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <Input
            label="Nome do Serviço *"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Ex: Manta asfáltica poliéster 3mm"
            data-testid="input-service-name"
          />

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1">
              Descrição <span className="font-normal text-slate-400 text-xs">(aparece no PDF do orçamento)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:outline-none focus:border-primary transition-all resize-none text-sm"
              placeholder="Descreva o serviço detalhadamente..."
              data-testid="input-service-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Preço de venda (R$/m²) *" type="number" step="0.01" min="0" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} placeholder="0,00" data-testid="input-service-price" />
            <Input label="Mão de obra (R$/m²)" type="number" step="0.01" min="0" value={laborCostPerM2} onChange={e => setLaborCostPerM2(e.target.value)} placeholder="0,00" data-testid="input-service-labor" />
            <Input label="Material (kg ou L / m²)" type="number" step="0.01" min="0" value={materialConsumptionPerM2} onChange={e => setMaterialConsumptionPerM2(e.target.value)} placeholder="0,00" data-testid="input-service-material" />
            <Input label="Transporte (R$/m²)" type="number" step="0.01" min="0" value={transportCostPerM2} onChange={e => setTransportCostPerM2(e.target.value)} placeholder="0,00" data-testid="input-service-transport" />
          </div>

          {/* â”€â”€ Materiais e Consumo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="border-2 border-emerald-100 rounded-2xl overflow-hidden">
            {/* Section header */}
            <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-900">Materiais e Consumo</span>
                <span className="text-xs text-emerald-600 font-normal bg-emerald-100 px-2 py-0.5 rounded-full ml-1">
                  uso interno — não aparece no PDF
                </span>
              </div>
              <button
                type="button"
                onClick={addMaterial}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
                data-testid="button-add-material"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Material
              </button>
            </div>

            <div className="p-4 space-y-3">
              {serviceMaterials.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum material vinculado.</p>
                  <p className="text-xs mt-1">Clique em "Adicionar Material" para vincular itens do estoque e definir o consumo por m² ou fixo.</p>
                </div>
              ) : (
                <>
                  {serviceMaterials.map((mat, idx) => {
                    const invItem = (inventoryItems as any[]).find((it: any) => it.id === mat.inventoryId);
                    const qty = Number(mat.quantity) || 0;
                    return (
                      <div
                        key={idx}
                        className="bg-white border-2 border-slate-100 rounded-xl p-3 space-y-2.5"
                        data-testid={`material-row-${idx}`}
                      >
                        {/* Row header */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            Material #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeMaterial(idx)}
                            className="text-slate-300 hover:text-red-500 p-1 transition-colors rounded"
                            data-testid={`button-remove-material-${idx}`}
                            title="Remover material"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Material selector */}
                        <div>
                          <label className="text-xs text-slate-500 font-medium block mb-1">Item do Estoque</label>
                          <select
                            value={mat.inventoryId || ""}
                            onChange={e => updateMaterial(idx, "inventoryId", e.target.value)}
                            className="w-full text-sm border-2 border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 bg-slate-50 transition-all"
                            data-testid={`select-material-item-${idx}`}
                          >
                            <option value="">Selecionar item do estoque...</option>
                            {(inventoryItems as any[]).sort((a: any, b: any) => a.name.localeCompare(b.name)).map((item: any) => (
                              <option key={item.id} value={item.id}>
                                {item.name} — {item.unit || "unid"} (estoque: {item.quantity})
                              </option>
                            ))}
                          </select>
                          {invItem && (
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              Unidade: <strong className="text-slate-600">{invItem.unit || "unid"}</strong>
                              <span className="mx-1">·</span>
                              Estoque atual: <strong className="text-slate-600">{invItem.quantity}</strong>
                            </p>
                          )}
                        </div>

                        {/* Type + Quantity row */}
                        <div className="space-y-2.5">
                          {/* Consumption type toggle */}
                          <div>
                            <label className="text-xs text-slate-500 font-medium block mb-1">Tipo de Consumo</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => updateMaterial(idx, "unit", "per_m2")}
                                className={`flex-1 text-xs font-semibold py-2 rounded-lg border-2 transition-all ${mat.unit === "per_m2" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:border-blue-300"}`}
                                data-testid={`button-per-m2-${idx}`}
                              >
                                Por m²
                              </button>
                              <button
                                type="button"
                                onClick={() => updateMaterial(idx, "unit", "per_kg")}
                                className={`flex-1 text-xs font-semibold py-2 rounded-lg border-2 transition-all ${mat.unit === "per_kg" || mat.unit === "fixed" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-500 hover:border-orange-300"}`}
                                data-testid={`button-per-kg-${idx}`}
                              >
                                Por quilo
                              </button>
                            </div>
                          </div>

                          {/* Fields per type */}
                          {mat.unit === "per_m2" && (
                            <div>
                              <label className="text-xs text-slate-500 font-medium block mb-1">Unidades por m²</label>
                              <input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={mat.quantity || ""}
                                onChange={e => updateMaterial(idx, "quantity", Number(e.target.value))}
                                placeholder="Ex: 0.1"
                                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 bg-slate-50 transition-all"
                                data-testid={`input-material-qty-${idx}`}
                              />
                            </div>
                          )}

                          {(mat.unit === "per_kg" || mat.unit === "fixed") && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-slate-500 font-medium block mb-1">Kilos por m²</label>
                                <input
                                  type="number"
                                  min="0.001"
                                  step="0.001"
                                  value={mat.kilosPerM2 || ""}
                                  onChange={e => updateMaterial(idx, "kilosPerM2", Number(e.target.value))}
                                  placeholder="Ex: 2"
                                  className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-slate-50 transition-all"
                                  data-testid={`input-kilos-per-m2-${idx}`}
                                />
                                <p className="text-xs text-slate-400 mt-0.5">kg consumidos por m²</p>
                              </div>
                              <div>
                                <label className="text-xs text-slate-500 font-medium block mb-1">Peso do material (kg)</label>
                                <input
                                  type="number"
                                  min="0.001"
                                  step="0.001"
                                  value={mat.weightPerUnit || ""}
                                  onChange={e => updateMaterial(idx, "weightPerUnit", Number(e.target.value))}
                                  placeholder="Ex: 18"
                                  className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-slate-50 transition-all"
                                  data-testid={`input-weight-per-unit-${idx}`}
                                />
                                <p className="text-xs text-slate-400 mt-0.5">kg por unidade/caixa</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Inline preview */}
                        {mat.inventoryId > 0 && mat.unit === "per_m2" && qty > 0 && (
                          <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600 flex items-center justify-between">
                            <span>Exemplo:</span>
                            <div className="flex gap-4">
                              {[20, 50, 100].map(area => (
                                <span key={area}>
                                  <strong>{area} m²</strong> → {Math.ceil(qty * area)} <span className="text-slate-400">{invItem?.unit || "unid"}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {mat.inventoryId > 0 && (mat.unit === "per_kg" || mat.unit === "fixed") && Number(mat.kilosPerM2) > 0 && Number(mat.weightPerUnit) > 0 && (
                          <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs text-orange-800">
                            <div className="font-semibold mb-1">Cálculo: (Área × {mat.kilosPerM2} kg/m²) ÷ {mat.weightPerUnit} kg/unid</div>
                            <div className="flex gap-4 text-orange-700">
                              {[10, 20, 50, 100].map(area => {
                                const r = Math.ceil((area * Number(mat.kilosPerM2)) / Number(mat.weightPerUnit));
                                return (
                                  <span key={area}>
                                    <strong>{area} m²</strong> → {r} <span className="opacity-70">{invItem?.unit || "unid"}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Warning for incomplete rows */}
                  {serviceMaterials.some(m => {
                    if (!m.inventoryId) return true;
                    if (m.unit === "per_kg" || m.unit === "fixed") return !(Number(m.kilosPerM2) > 0 && Number(m.weightPerUnit) > 0);
                    return !(m.quantity > 0);
                  }) && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Linhas sem material ou parâmetros incompletos serão ignoradas ao salvar.
                    </div>
                  )}

                  {/* Preview table for 100m² */}
                  {validMaterialsForPreview.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-emerald-800 mb-2">
                        Consumo estimado para 100 m²:
                      </p>
                      <div className="space-y-1">
                        {validMaterialsForPreview.map((m, i) => {
                          const invItem = (inventoryItems as any[]).find((it: any) => it.id === m.inventoryId);
                          const qty100 = calcMaterialQty(m, 100);
                          const label = m.unit === "per_kg"
                            ? `(${m.kilosPerM2} kg/m² ÷ ${m.weightPerUnit} kg/unid)`
                            : m.unit === "per_m2" ? `(${m.quantity}/m²)` : "(fixo)";
                          return (
                            <div key={i} className="flex justify-between text-xs text-emerald-700">
                              <span>{m.name || invItem?.name || "Material"} <span className="text-emerald-500">{label}</span></span>
                              <span className="font-bold">{qty100} <span className="font-normal text-emerald-500">{invItem?.unit || "unid"}</span></span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Add material button (bottom) */}
              <button
                type="button"
                onClick={addMaterial}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                data-testid="button-add-material-bottom"
              >
                <Plus className="w-4 h-4" />
                Adicionar Material
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setIsOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" isLoading={isPending} disabled={!name.trim()} data-testid="button-save-service">
              {editing ? "Salvar Alterações" : "Criar Serviço"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
