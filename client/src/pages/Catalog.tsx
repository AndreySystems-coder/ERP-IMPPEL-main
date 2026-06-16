import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { PrivacyToggle } from "@/components/PrivacyToggle";
import { usePrivacyMask } from "@/hooks/use-privacy-mask";
import { asArray } from "@/lib/safeData";
import {
  Search, Plus, Edit2, Trash2, Package, X, Camera, Tag,
  Building2, Barcode, Eye, EyeOff,
  Grid3X3, List, ShoppingCart,
} from "lucide-react";

// Section
type Product = {
  id: number;
  inventoryId?: number;
  name: string;
  description?: string;
  category: string;
  code?: string;
  imageUrl?: string;
  brand?: string;
  unit: string;
  salePrice: number;
  commission: number;
  maxDiscount: number;
  active: boolean;
};

// Section
const CATEGORIES = [
  "Argamassa Polimérica",
  "Manta Líquida",
  "Manta Asfáltica",
  "Sistema de Drenagem",
  "Primer",
  "Selante PU",
  "Massa Asfáltica",
  "Ferramenta",
  "Tela",
  "Geotêxtil",
  "Acessório",
  "EPI",
  "Pó Mineral",
  "Fita",
  "Sem Categoria",
];

const CATEGORY_BADGE = "bg-slate-100 text-slate-700 border-slate-200";

// Section
function ProductForm({
  product,
  onClose,
  onSave,
  saving,
}: {
  product: Partial<Product> | null;
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<Product>>(product || {
    name: "", description: "", category: "Sem Categoria", code: "",
    imageUrl: "", brand: "", unit: "un", salePrice: 0, commission: 0,
    maxDiscount: 0, active: true,
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof Product, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("imageUrl", ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {product?.id ? "Editar Produto" : "Novo Produto"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Photo */}
          <div className="flex gap-4 items-start">
            <div className="w-24 h-24 shrink-0 border-2 border-dashed border-gray-200 rounded-xl overflow-hidden flex items-center justify-center bg-gray-50">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="Produto" className="w-full h-full object-cover" />
              ) : (
                <Package className="w-8 h-8 text-gray-300" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} data-testid="button-upload-photo">
                <Camera className="w-4 h-4 mr-2" /> {form.imageUrl ? "Trocar Foto" : "Adicionar Foto"}
              </Button>
              {form.imageUrl && (
                <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => set("imageUrl", "")}>
                  <Trash2 className="w-3 h-3 mr-1" /> Remover
                </Button>
              )}
              <p className="text-xs text-gray-400">JPG, PNG ou WEBP. Tamanho recomendado: 400×400px</p>
            </div>
          </div>

          {/* Name + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do Produto <span className="text-red-500">*</span></Label>
              <Input value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="Ex: Viaplus 1000 (18 kg)" data-testid="input-product-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.category || "Sem Categoria"} onValueChange={v => set("category", v)}>
                <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Code + Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Barcode className="w-4 h-4 text-gray-400" /> Código / SKU</Label>
              <Input value={form.code || ""} onChange={e => set("code", e.target.value)} placeholder="Ex: 7890137000003" data-testid="input-product-code" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-gray-400" /> Empresa / Fabricante</Label>
              <Input value={form.brand || ""} onChange={e => set("brand", e.target.value)} placeholder="Ex: Viapol, Dryko, Sikaflex" data-testid="input-product-brand" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descrição / Função</Label>
            <Textarea value={form.description || ""} onChange={e => set("description", e.target.value)}
              placeholder="Descreva a função, aplicação e características do produto..." rows={3}
              data-testid="textarea-product-description" />
          </div>

          {/* Price + Unit */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Preço de Venda <span className="text-red-500">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">R$</span>
                <Input type="number" step="0.01" min="0" value={form.salePrice || ""} onChange={e => set("salePrice", parseFloat(e.target.value) || 0)}
                  className="pl-9" placeholder="0,00" data-testid="input-sale-price" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Input value={form.unit || "un"} onChange={e => set("unit", e.target.value)} placeholder="un, m², m, L, kg" data-testid="input-unit" />
            </div>
            <div className="space-y-1.5">
              <Label>Desc. Máx. (%)</Label>
              <Input type="number" min="0" max="100" value={form.maxDiscount || ""} onChange={e => set("maxDiscount", parseFloat(e.target.value) || 0)}
                placeholder="0" data-testid="input-max-discount" />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input type="checkbox" id="active-toggle" checked={form.active ?? true} onChange={e => set("active", e.target.checked)} className="w-4 h-4 accent-blue-900" />
            <label htmlFor="active-toggle" className="text-sm font-medium text-gray-700">Produto ativo (visível no catálogo)</label>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name || saving} className="flex-1 bg-blue-900 hover:bg-blue-800 text-white" data-testid="button-save-product">
            {saving ? "Salvando..." : product?.id ? "Salvar Alterações" : "Criar Produto"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Section
function ProductCard({
  product, isAdmin, onEdit, onDelete, onToggle, viewMode, privacyMaskEnabled, maskText, maskMoney, maskNumber,
}: {
  product: Product; isAdmin: boolean;
  onEdit: () => void; onDelete: () => void; onToggle: () => void;
  viewMode: "grid" | "list";
  privacyMaskEnabled: boolean;
  maskText: (value: unknown, fallback?: string) => string;
  maskMoney: (value: unknown) => string;
  maskNumber: (value: unknown, suffix?: string) => string;
}) {
  const catColor = CATEGORY_BADGE;

  if (viewMode === "list") {
    return (
      <div className={`flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all ${!product.active ? "opacity-60" : ""}`} data-testid={`card-product-${product.id}`}>
        {/* Image */}
        <div className="w-14 h-14 shrink-0 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden flex items-center justify-center">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-6 h-6 text-gray-300" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm truncate">{maskText(product.name, "Material ••••")}</p>
            {!product.active && <Badge variant="outline" className="text-xs text-gray-400">Inativo</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge className={`text-xs border ${catColor}`}>{product.category}</Badge>
            {product.brand && <span className="text-xs text-gray-400">{maskText(product.brand, "Fabricante ••••")}</span>}
            {product.code && <span className="text-xs text-gray-400 font-mono">{maskText(product.code, "SKU ••••")}</span>}
          </div>
          {product.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{privacyMaskEnabled ? "••••••••••" : product.description}</p>}
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-blue-900">{maskMoney(product.salePrice)}</p>
          <p className="text-xs text-gray-400">/{product.unit || "un"}</p>
        </div>

        {/* Actions (admin only) */}
        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            <button onClick={onToggle} className={`p-2 rounded-lg transition-colors ${product.active ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100" : "text-green-600 hover:bg-green-50"}`} title={product.active ? "Desativar" : "Ativar"}>
              {product.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={onEdit} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" data-testid={`button-edit-product-${product.id}`}>
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors" data-testid={`button-delete-product-${product.id}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all flex flex-col ${!product.active ? "opacity-60" : ""}`} data-testid={`card-product-${product.id}`}>
      {/* Photo */}
      <div className="relative h-44 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-16 h-16 text-gray-200" />
        )}
        {/* Category badge */}
        <div className="absolute top-2 left-2">
          <Badge className={`text-xs border shadow-sm ${catColor}`}>{product.category}</Badge>
        </div>
        {!product.active && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="text-xs bg-white text-gray-400">Inativo</Badge>
          </div>
        )}
        {/* Admin actions */}
        {isAdmin && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            <button onClick={onToggle} className={`p-1.5 rounded-lg shadow transition-colors ${product.active ? "bg-white/90 text-gray-500 hover:text-gray-700" : "bg-white/90 text-green-600"}`} title={product.active ? "Desativar" : "Ativar"}>
              {product.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onEdit} className="p-1.5 rounded-lg shadow bg-white/90 text-blue-600 hover:text-blue-800 transition-colors" data-testid={`button-edit-product-${product.id}`}>
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg shadow bg-white/90 text-red-500 hover:text-red-700 transition-colors" data-testid={`button-delete-product-${product.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">{maskText(product.name, "Material ••••")}</p>
          {product.brand && <p className="text-xs text-gray-400 mt-0.5">{maskText(product.brand, "Fabricante ••••")}</p>}
        </div>
        {product.code && (
          <p className="text-xs text-gray-400 font-mono flex items-center gap-1">
            <Barcode className="w-3 h-3" /> {maskText(product.code, "SKU ••••")}
          </p>
        )}
        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-3 flex-1">{privacyMaskEnabled ? "••••••••••" : product.description}</p>
        )}
        <div className="pt-2 border-t border-gray-50 flex items-center justify-between mt-auto">
          <div>
            <p className="text-lg font-bold text-blue-900">{maskMoney(product.salePrice)}</p>
            <p className="text-xs text-gray-400">por {product.unit || "un"}</p>
          </div>
          {product.maxDiscount > 0 && (
            <Badge variant="outline" className="text-xs text-green-700 border-green-200">
              Desc. até {maskNumber(product.maxDiscount, "%")}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// Section
export default function Catalog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentUser } = useUser();
  const isAdmin = (currentUser as any)?.role === "admin";

  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const productsList = asArray<Product>(products);
  const { privacyMaskEnabled, togglePrivacyMask, maskText, maskMoney, maskNumber } = usePrivacyMask();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null | false>(false);

  // â”€â”€â”€ Mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); setEditingProduct(false); toast({ title: "Produto criado!" }); },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); setEditingProduct(false); toast({ title: "Produto atualizado!" }); },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); toast({ title: "Produto removido." }); },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const handleSave = (data: Partial<Product>) => {
    if (!data.name) return;
    if (editingProduct && (editingProduct as Product).id) {
      updateMutation.mutate({ id: (editingProduct as Product).id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggle = (p: Product) => {
    updateMutation.mutate({ id: p.id, data: { active: !p.active } });
  };

  // â”€â”€â”€ Filtering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const activeProducts = useMemo(() =>
    productsList.filter(p => showInactive ? true : p.active),
    [productsList, showInactive]
  );

  const categories = useMemo(() => {
    const cats = Array.from(new Set(activeProducts.map(p => p.category || "Sem Categoria")));
    return ["Todas", ...cats.sort()];
  }, [activeProducts]);

  const filtered = useMemo(() => {
    return activeProducts.filter(p => {
      const matchSearch = !search || [p.name, p.description, p.code, p.brand].some(f => f?.toLowerCase().includes(search.toLowerCase()));
      const matchCat = selectedCategory === "Todas" || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [activeProducts, search, selectedCategory]);

  const grouped = useMemo(() => {
    if (selectedCategory !== "Todas") return { [selectedCategory]: filtered };
    const groups: Record<string, Product[]> = {};
    for (const p of filtered) {
      const cat = p.category || "Sem Categoria";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    return groups;
  }, [filtered, selectedCategory]);

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">Catálogo de Produtos</h1>
            <p className="text-sm text-gray-500">{productsList.filter(p => p.active).length} produto(s) ativo(s) · {categories.length - 1} categoria(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PrivacyToggle enabled={privacyMaskEnabled} onToggle={togglePrivacyMask} />
          {isAdmin && (
            <>
              <button
                onClick={() => setShowInactive(s => !s)}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${showInactive ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                data-testid="button-toggle-inactive"
              >
                {showInactive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {showInactive ? "Ocultando inativos" : "Ver inativos"}
              </button>
              <Button onClick={() => setEditingProduct({})} className="bg-blue-900 hover:bg-blue-800 text-white" data-testid="button-new-product">
                <Plus className="w-4 h-4 mr-1.5" /> Novo Produto
              </Button>
            </>
          )}
        </div>
      </div>

      {/* â”€â”€ Search + View toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, código ou fabricante..."
            className="pl-9" data-testid="input-search-products" />
        </div>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setViewMode("grid")} className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-blue-900 text-white" : "text-gray-400 hover:bg-gray-50"}`} title="Grade">
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={`p-2.5 transition-colors ${viewMode === "list" ? "bg-blue-900 text-white" : "text-gray-400 hover:bg-gray-50"}`} title="Lista">
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* â”€â”€ Category filter tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              selectedCategory === cat
                ? "bg-blue-900 text-white border-blue-900 shadow-md"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
            data-testid={`tab-category-${cat}`}
          >
            {cat}
            {cat !== "Todas" && (
              <span className={`ml-1.5 text-xs ${selectedCategory === cat ? "text-blue-200" : "text-gray-400"}`}>
                ({activeProducts.filter(p => p.category === cat).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* â”€â”€ Empty state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-400">
          <Package className="w-14 h-14 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-gray-500">Nenhum produto encontrado</p>
          <p className="text-sm mt-1">
            {search ? `Nenhum resultado para "${search}"` : isAdmin ? "Clique em 'Novo Produto' para começar." : "Nenhum produto cadastrado ainda."}
          </p>
        </CardContent></Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              {selectedCategory === "Todas" && (
                <div className="flex items-center gap-3 mb-4">
                  <Badge className={`text-sm border px-3 py-1 ${CATEGORY_BADGE}`}>
                    {cat}
                  </Badge>
                  <div className="h-px flex-1 bg-gray-100" />
                  <span className="text-xs text-gray-400 shrink-0">{items.length} produto(s)</span>
                </div>
              )}
              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {items.map(p => (
                    <ProductCard
                      key={p.id} product={p} isAdmin={isAdmin} viewMode="grid"
                      privacyMaskEnabled={privacyMaskEnabled}
                      maskText={maskText}
                      maskMoney={maskMoney}
                      maskNumber={maskNumber}
                      onEdit={() => setEditingProduct(p)}
                      onDelete={() => { if (confirm(`Remover "${p.name}"?`)) deleteMutation.mutate(p.id); }}
                      onToggle={() => handleToggle(p)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map(p => (
                    <ProductCard
                      key={p.id} product={p} isAdmin={isAdmin} viewMode="list"
                      privacyMaskEnabled={privacyMaskEnabled}
                      maskText={maskText}
                      maskMoney={maskMoney}
                      maskNumber={maskNumber}
                      onEdit={() => setEditingProduct(p)}
                      onDelete={() => { if (confirm(`Remover "${p.name}"?`)) deleteMutation.mutate(p.id); }}
                      onToggle={() => handleToggle(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* â”€â”€ Stats footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {filtered.length > 0 && (
        <div className="flex gap-6 p-4 bg-gray-50 rounded-2xl text-center text-sm flex-wrap justify-center">
          <div>
            <p className="text-xl font-bold text-gray-800">{filtered.length}</p>
            <p className="text-xs text-gray-400">produtos exibidos</p>
          </div>
          <div className="w-px bg-gray-200 self-stretch" />
          <div>
            <p className="text-xl font-bold text-blue-900">{maskMoney(Math.min(...filtered.map(p => p.salePrice)))}</p>
            <p className="text-xs text-gray-400">menor preço</p>
          </div>
          <div className="w-px bg-gray-200 self-stretch" />
          <div>
            <p className="text-xl font-bold text-blue-900">{maskMoney(Math.max(...filtered.map(p => p.salePrice)))}</p>
            <p className="text-xs text-gray-400">maior preço</p>
          </div>
          <div className="w-px bg-gray-200 self-stretch" />
          <div>
            <p className="text-xl font-bold text-green-700">{maskMoney(filtered.reduce((s, p) => s + p.salePrice, 0) / filtered.length)}</p>
            <p className="text-xs text-gray-400">preço médio</p>
          </div>
        </div>
      )}

      {/* â”€â”€ Form Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {editingProduct !== false && (
        <ProductForm
          product={editingProduct || null}
          onClose={() => setEditingProduct(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
