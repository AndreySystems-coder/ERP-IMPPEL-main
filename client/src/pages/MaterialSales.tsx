import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileDown, Plus, Search, ShoppingCart, X } from "lucide-react";
import { jsPDF } from "jspdf";

import { Button } from "@/components/Button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { getEffectiveMaterialSaleDiscountLimit } from "@shared/materialSalesPolicy";

type CatalogItem = {
  id: number;
  inventoryId: number;
  name: string;
  code?: string | null;
  brand?: string | null;
  description?: string | null;
  unit: string | null;
  salePrice: number;
  maxDiscount: number;
  effectiveMaxDiscount?: number;
  stock: number;
};

type CartItem = CatalogItem & { quantity: number; discountPercent: number };

type Sale = {
  id: number;
  buyerName: string;
  buyerPhone?: string | null;
  createdByUsername: string;
  items: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  status: string;
  approvedByUsername?: string | null;
  createdAt: string;
};

type SalesResponse = { sales: Sale[]; catalog: CatalogItem[]; generalMaxDiscount: number; canApprove: boolean };

async function apiRequest(method: string, path: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Não foi possível concluir a operação.");
  return data;
}

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const normalizeSearch = (value: unknown) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function generateReceipt(sale: Sale) {
  const doc = new jsPDF();
  const items = JSON.parse(sale.items || "[]");
  doc.setFontSize(18);
  doc.text("IMPPEL - Comprovante de venda", 14, 18);
  doc.setFontSize(11);
  doc.text(`Venda #${sale.id} - ${sale.status.toUpperCase()}`, 14, 30);
  doc.text(`Comprador: ${sale.buyerName}`, 14, 38);
  doc.text(`Telefone: ${sale.buyerPhone || "-"}`, 14, 45);
  doc.text(`Responsável: ${sale.createdByUsername}`, 14, 52);
  let y = 65;
  items.forEach((item: any) => {
    doc.text(`${item.quantity} ${item.unit} - ${item.name}`, 14, y);
    doc.text(money(item.total), 150, y);
    y += 8;
  });
  doc.line(14, y, 196, y);
  doc.text(`Subtotal: ${money(sale.subtotal)}`, 14, y + 10);
  doc.text(`Desconto: ${money(sale.discountAmount)}`, 14, y + 18);
  doc.setFontSize(14);
  doc.text(`Total: ${money(sale.total)}`, 14, y + 30);
  doc.save(`IMPPEL-venda-${sale.id}.pdf`);
}

export default function MaterialSales() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: user } = useUser();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [maxDiscountInput, setMaxDiscountInput] = useState("");

  const { data } = useQuery<SalesResponse>({
    queryKey: ["/api/material-sales"],
    queryFn: () => apiRequest("GET", "/api/material-sales"),
  });
  const catalog = data?.catalog || [];
  const sales = data?.sales || [];
  const generalMaxDiscount = data?.generalMaxDiscount ?? 10;
  const canCreate = canAccess(user as any, "createMaterialSales");
  const maxDiscountFor = (item: Pick<CatalogItem, "maxDiscount" | "effectiveMaxDiscount">) =>
    getEffectiveMaterialSaleDiscountLimit(
      { maxDiscount: item.effectiveMaxDiscount ?? item.maxDiscount },
      item.effectiveMaxDiscount ?? generalMaxDiscount,
    );

  const searchTerm = normalizeSearch(search);
  const filteredCatalog = catalog.filter(item => {
    if (!searchTerm) return true;
    return [item.name, item.code, item.brand, item.description]
      .some(field => normalizeSearch(field).includes(searchTerm));
  });
  const totals = useMemo(() => cart.reduce((summary, item) => {
    const original = item.salePrice * item.quantity;
    const final = original * (1 - item.discountPercent / 100);
    return { subtotal: summary.subtotal + original, total: summary.total + final };
  }, { subtotal: 0, total: 0 }), [cart]);

  const createSale = useMutation({
    mutationFn: () => apiRequest("POST", "/api/material-sales", {
      buyerName, buyerPhone, notes,
      items: cart.map(item => ({ productId: item.id, quantity: item.quantity, discountPercent: item.discountPercent })),
    }),
    onSuccess: () => {
      setCart([]); setBuyerName(""); setBuyerPhone(""); setNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/material-sales"] });
      toast({ title: "Pedido enviado para aprovação" });
    },
    onError: (error: Error) => toast({ title: "Venda não registrada", description: error.message, variant: "destructive" }),
  });
  const processSale = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) => apiRequest("POST", `/api/material-sales/${id}/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Venda processada" });
    },
    onError: (error: Error) => toast({ title: "Não foi possível processar", description: error.message, variant: "destructive" }),
  });
  const saveSettings = useMutation({
    mutationFn: () => apiRequest("POST", "/api/material-sales/settings", { generalMaxDiscount: Number(maxDiscountInput) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-sales"] });
      setMaxDiscountInput("");
      toast({ title: "Limite geral atualizado" });
    },
  });

  const addToCart = (product: CatalogItem) => {
    setCart(current => {
      const existing = current.find(item => item.id === product.id);
      if (existing) return current.map(item => item.id === product.id ? { ...item, quantity: Math.min(item.stock, item.quantity + 1) } : item);
      return [...current, { ...product, quantity: 1, discountPercent: 0 }];
    });
  };

  const updateCart = (id: number, updates: Partial<CartItem>) => setCart(current => current
    .map(item => item.id === id ? { ...item, ...updates } : item)
    .filter(item => item.quantity > 0));

  return (
    <main className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900"><ShoppingCart className="h-7 w-7 text-blue-700" /> Venda de Materiais</h1>
          <p className="mt-1 text-sm text-slate-500">Pedidos com desconto controlado e baixa de estoque após aprovação.</p>
        </div>
        {data?.canApprove && (
          <div className="flex items-end gap-2">
            <label className="text-xs font-semibold text-slate-600">Desconto geral máximo
              <input type="number" min="0" max="100" value={maxDiscountInput} onChange={event => setMaxDiscountInput(event.target.value)} placeholder={`${generalMaxDiscount}%`} className="mt-1 block h-10 w-32 rounded-md border border-slate-300 px-3" />
            </label>
            <Button variant="outline" onClick={() => saveSettings.mutate()} disabled={!maxDiscountInput}>Salvar</Button>
          </div>
        )}
      </header>

      {canCreate && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar por nome, código ou SKU..."
                className="h-10 w-full rounded-md border border-slate-300 pl-10 pr-3"
                data-testid="input-material-sale-search"
              />
              {searchTerm && (
                <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {filteredCatalog.slice(0, 8).map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => { addToCart(product); setSearch(product.name); }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-800">{product.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {[product.code ? `SKU ${product.code}` : "", product.brand || "", `${product.stock} ${product.unit || "un"} em estoque`].filter(Boolean).join(" • ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-blue-800">{money(product.salePrice)}</span>
                    </button>
                  ))}
                  {filteredCatalog.length === 0 && (
                    <div className="px-3 py-3 text-sm text-slate-500">Nenhum material encontrado para "{search}".</div>
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCatalog.map(product => (
                <article key={product.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <h2 className="font-semibold text-slate-900">{product.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">Estoque: {product.stock} {product.unit}</p>
                  <p className="mt-3 text-lg font-bold text-blue-800">{money(product.salePrice)}</p>
                  <p className="text-xs text-slate-500">Desconto até {maxDiscountFor(product)}%{Number(product.maxDiscount) > 0 ? "" : " (limite geral)"}</p>
                  <Button className="mt-4 w-full" onClick={() => addToCart(product)} disabled={product.stock <= 0}><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
                </article>
              ))}
            </div>
          </section>

          <aside className="border-l border-slate-200 pl-0 lg:pl-6">
            <h2 className="font-bold text-slate-900">Carrinho ({cart.length})</h2>
            <div className="mt-3 space-y-3">
              {cart.map(item => {
                const maxDiscount = maxDiscountFor(item);
                return (
                  <div key={item.id} className="border-b border-slate-200 pb-3">
                    <div className="flex justify-between gap-2"><strong className="text-sm">{item.name}</strong><button onClick={() => setCart(current => current.filter(row => row.id !== item.id))} aria-label="Remover"><X className="h-4 w-4" /></button></div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="text-xs text-slate-600">Quantidade<input type="number" min="1" max={item.stock} value={item.quantity} onChange={event => updateCart(item.id, { quantity: Math.min(item.stock, Number(event.target.value)) })} className="mt-1 h-9 w-full rounded border px-2" /></label>
                      <label className="text-xs text-slate-600">Desconto (máx. {maxDiscount}%)<input type="number" min="0" max={maxDiscount} value={item.discountPercent} onChange={event => updateCart(item.id, { discountPercent: Number(event.target.value) })} className={`mt-1 h-9 w-full rounded border px-2 ${item.discountPercent > maxDiscount ? "border-red-500" : ""}`} /></label>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between"><span>Valor original</span><strong>{money(totals.subtotal)}</strong></div>
              <div className="flex justify-between"><span>Desconto</span><strong>{money(totals.subtotal - totals.total)}</strong></div>
              <div className="flex justify-between text-lg"><span>Total</span><strong>{money(totals.total)}</strong></div>
            </div>
            <div className="mt-4 space-y-3">
              <input value={buyerName} onChange={event => setBuyerName(event.target.value)} placeholder="Nome do comprador" className="h-10 w-full rounded-md border px-3" />
              <input value={buyerPhone} onChange={event => setBuyerPhone(event.target.value)} placeholder="Telefone" className="h-10 w-full rounded-md border px-3" />
              <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Observação" className="min-h-20 w-full rounded-md border p-3" />
              <Button className="w-full" onClick={() => createSale.mutate()} disabled={!buyerName.trim() || cart.length === 0 || cart.some(item => item.discountPercent > maxDiscountFor(item))} isLoading={createSale.isPending}>Enviar para aprovação</Button>
            </div>
          </aside>
        </div>
      )}

      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-lg font-bold text-slate-900">Histórico de vendas</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="p-3">Pedido</th><th className="p-3">Comprador</th><th className="p-3">Responsável</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3 text-right">Ações</th></tr></thead>
            <tbody>{sales.map(sale => (
              <tr key={sale.id} className="border-b border-slate-100">
                <td className="p-3 font-semibold">#{sale.id}</td><td className="p-3">{sale.buyerName}</td><td className="p-3">{sale.createdByUsername}</td><td className="p-3 font-semibold">{money(sale.total)}</td><td className="p-3 capitalize">{sale.status}</td>
                <td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => generateReceipt(sale)} title="Gerar comprovante" className="rounded border p-2"><FileDown className="h-4 w-4" /></button>{data?.canApprove && sale.status === "pendente" && <><button onClick={() => processSale.mutate({ id: sale.id, action: "approve" })} title="Aprovar" className="rounded border border-green-200 p-2 text-green-700"><Check className="h-4 w-4" /></button><button onClick={() => processSale.mutate({ id: sale.id, action: "reject" })} title="Rejeitar" className="rounded border border-red-200 p-2 text-red-700"><X className="h-4 w-4" /></button></>}</div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
