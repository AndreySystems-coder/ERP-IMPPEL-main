import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useInventory, useCreateInventory, useUpdateInventory, useDeleteInventory } from "@/hooks/use-inventory";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { AlertTriangle, History, TrendingDown, TrendingUp, X } from "lucide-react";
import BackupManager from "@/components/BackupManager";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { DuplicateProductsAlert } from "@/features/inventory/components/DuplicateProductsAlert";
import { InventoryMovementForm } from "@/features/inventory/components/InventoryMovementForm";
import { InventoryMovementHistory } from "@/features/inventory/components/InventoryMovementHistory";
import { InventoryProductList } from "@/features/inventory/components/InventoryProductList";
import { QuickCountPanel } from "@/features/inventory/components/QuickCountPanel";
import { QuickCountPreview } from "@/features/inventory/components/QuickCountPreview";
import type { BatchItem, InventoryItem, Movement, QuickCountRow as RapidaRow } from "@/features/inventory/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function normName(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/(\d+)([a-z]+)/g, "$1 $2")   // "4mm" -> "4 mm"
    .replace(/([a-z]+)(\d+)/g, "$1 $2")   // "liq3" -> "liq 3" (edge)
    .replace(/\s+/g, " ").trim();
}

const QUERY_ALIASES: [RegExp, string][] = [
  [/\bicoforce\b/g,    "icoquarz"],
  [/\bmultiuso\b/g,    "mul"],
  [/\bliquida?\b/g,    "liq"],
  [/\bdrykomanta\b/g,  "drykoprimer"],
  [/\baluminio\b/g,    "alu"],
  [/\bsikadur\b/g,     "sikadur epoxi"],
  [/\bantiraiz\b/g,    "anti raiz"],
  [/\bfuseprotec\b/g,  "fuseprotec"],
  [/\bimperfachada\b/g,"imperfachada"],
];

function applyQueryAliases(q: string): string {
  let r = q;
  for (const [pat, rep] of QUERY_ALIASES) r = r.replace(pat, rep);
  return r;
}

function scoreMatch(query: string, candidate: string): number {
  const q = applyQueryAliases(normName(query));
  const c = normName(candidate);
  if (c === q) return 100;
  if (c.includes(q) || q.includes(c)) return 85;

  const qNums = (q.match(/\d+/g) || []) as string[];
  const cNums = (c.match(/\d+/g) || []) as string[];
  if (qNums.length > 0 && !qNums.every(n => cNums.includes(n))) return 0;

  const qWords = q.split(" ").filter(w => w.length >= 2 && !/^\d+$/.test(w));
  const cWords = c.split(" ").filter(w => w.length >= 2 && !/^\d+$/.test(w));
  if (qWords.length === 0) return 0;

  const matched = qWords.filter(qw => cWords.some(cw =>
    qw === cw ||
    (qw.length >= 3 && cw.length >= 3 && (cw.includes(qw) || qw.includes(cw)))
  )).length;

  const queryCoverage = matched / qWords.length;
  const candidatePrecision = matched / Math.max(cWords.length, 1);
  return Math.round((queryCoverage * 0.70 + candidatePrecision * 0.30) * 70);
}


function parseCountLine(line: string): { name: string; qty: number } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  // Pattern: "5x Nome do produto" or "5X nome"
  let m = trimmed.match(/^(\d+(?:[.,]\d+)?)[xX]\s+(.+)$/);
  if (m) return { name: m[2].trim(), qty: parseFloat(m[1].replace(",", ".")) };
  // Pattern: "Nome - 45", "Nome: 45", "Nome - 45"
  m = trimmed.match(/^(.+?)\s*[-\u2013:]\s*(\d+(?:[.,]\d+)?)\s*$/);
  if (m) return { name: m[1].trim(), qty: parseFloat(m[2].replace(",", ".")) };
  // Pattern: trailing number "Broxa 12"
  m = trimmed.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)$/);
  if (m) return { name: m[1].trim(), qty: parseFloat(m[2].replace(",", ".")) };
  return null;
}

const apiRequest = async (method: string, path: string, body?: any) => {
  const res = await fetch(path, { method, body: body ? JSON.stringify(body) : undefined, headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
};

const fmtDate = (d: string) => {
  try { return new Date(d + "T12:00:00").toLocaleDateString("pt-BR"); } catch { return d; }
};

const nowYM = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const ymLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${monthNames[parseInt(m) - 1]} ${y}`;
};

function generateMovementPDF(selectedYM: string, movements: Movement[], items: InventoryItem[]) {
  const doc = new jsPDF();
  const label = ymLabel(selectedYM);
  const monthMovements = movements.filter(m => m.date.startsWith(selectedYM)).sort((a, b) => a.date.localeCompare(b.date));

  // Header
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("IMPPEL - Relatório de Movimentações de Estoque", 14, 12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Referência: ${label}`, 14, 21);
  doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")}`, 150, 21);

  doc.setTextColor(0, 0, 0);

  // Stats
  const entradas = monthMovements.filter(m => m.type === "ENTRADA").reduce((s, m) => s + m.quantity, 0);
  const saidas = monthMovements.filter(m => m.type === "SAÍDA").reduce((s, m) => s + m.quantity, 0);

  doc.setFontSize(10);
  doc.setFillColor(240, 253, 244);
  doc.rect(14, 33, 55, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Total Entradas", 16, 40);
  doc.setFont("helvetica", "normal");
  doc.text(`${entradas} unid.`, 16, 46);

  doc.setFillColor(254, 242, 242);
  doc.rect(74, 33, 55, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Total Saídas", 76, 40);
  doc.setFont("helvetica", "normal");
  doc.text(`${saidas} unid.`, 76, 46);

  doc.setFillColor(241, 245, 249);
  doc.rect(134, 33, 62, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Lançamentos", 136, 40);
  doc.setFont("helvetica", "normal");
  doc.text(`${monthMovements.length} registros`, 136, 46);

  // Movements table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Movimentações do Mês", 14, 57);

  autoTable(doc, {
    startY: 60,
    head: [["Data", "Produto", "Tipo", "Qtd", "Observação"]],
    body: monthMovements.map(m => [
      fmtDate(m.date),
      m.productName,
      m.type,
      m.quantity.toString(),
      m.notes || "",
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 65 },
      2: { cellWidth: 20 },
      3: { cellWidth: 15 },
      4: { cellWidth: 65 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawCell: (data: any) => {
      if (data.section === "body" && data.column.index === 2) {
        const isEntrada = data.cell.raw === "ENTRADA";
        doc.setTextColor(isEntrada ? 22 : 220, isEntrada ? 163 : 38, isEntrada ? 74 : 38);
      } else {
        doc.setTextColor(0, 0, 0);
      }
    },
  });

  // Stock summary table
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  if (finalY < 250) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Saldo Final do Estoque (posição atual)", 14, finalY);

    // Group items by those that had movement this month
    const movedIds = new Set(monthMovements.map(m => m.inventoryId));
    const movedItems = (items as InventoryItem[]).filter(i => movedIds.has(i.id));

    autoTable(doc, {
      startY: finalY + 3,
      head: [["Produto", "Unidade", "Saldo Atual", "Estoque Mín.", "Status"]],
      body: movedItems.map(i => [
        i.name,
        i.unit || "unid",
        i.quantity.toString(),
        i.minStock.toString(),
        i.quantity <= 0 ? "Sem estoque" : i.quantity <= i.minStock ? "Estoque baixo" : "OK",
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`IMPPEL - Impermeabilização | Av Dr Ulisses Guimarães 1296, Sorocaba SP`, 14, 290);
    doc.text(`Página ${i} de ${pageCount}`, 185, 290);
  }

  const filename = `IMPPEL_Estoque_${selectedYM}.pdf`;
  doc.save(filename);
}

export default function Inventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentUser } = useUser();
  const isAdmin = (currentUser as any)?.role === "admin";
  const { data: items = [], isLoading } = useInventory();
  const createItem = useCreateInventory();
  const updateItem = useUpdateInventory();
  const deleteItem = useDeleteInventory();

  const [activeTab, setActiveTab] = useState<"produtos" | "movimentacoes" | "rapida">("produtos");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  // Item form
  const [name, setName] = useState("");
  const [type, setType] = useState("material");
  const [unit, setUnit] = useState("unid");
  const [quantity, setQuantity] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [price, setPrice] = useState("");

  // Movement state
  const [selectedYM, setSelectedYM] = useState(nowYM());
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([{ inventoryId: "", quantity: "", type: "ENTRADA", searchText: "", dropdownOpen: false }]);
  const [batchNotes, setBatchNotes] = useState("");
  const [movSearch, setMovSearch] = useState("");

  // Edit movement modal
  const [editMovement, setEditMovement] = useState<Movement | null>(null);
  const [editMovType, setEditMovType] = useState<"ENTRADA" | "SAÍDA">("ENTRADA");
  const [editMovQty, setEditMovQty] = useState("");
  const [editMovDate, setEditMovDate] = useState("");
  const [editMovNotes, setEditMovNotes] = useState("");
  const [editMovInventoryId, setEditMovInventoryId] = useState<number>(0);

  // Contagem Física Rápida
  const [rapidaText, setRapidaText] = useState("");
  const [rapidaPreview, setRapidaPreview] = useState<RapidaRow[]>([]);
  const [rapidaConfirmZerar, setRapidaConfirmZerar] = useState(false);

  const [rapidaApplied, setRapidaApplied] = useState(false);

  const { data: movements = [] } = useQuery<Movement[]>({ queryKey: ["/api/inventory-movements"] });

  // Available months from movements data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(nowYM());
    (movements as Movement[]).forEach(m => {
      if (m.date) months.add(m.date.substring(0, 7));
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [movements]);

  // Movements for selected month
  const monthMovements = useMemo(() => {
    return (movements as Movement[])
      .filter(m => m.date.startsWith(selectedYM))
      .filter(m => {
        const q = movSearch.toLowerCase();
        return !q || m.productName.toLowerCase().includes(q) || (m.notes || "").toLowerCase().includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [movements, selectedYM, movSearch]);

  // Group by date
  const groupedByDay = useMemo(() => {
    const map: Record<string, Movement[]> = {};
    monthMovements.forEach(m => {
      if (!map[m.date]) map[m.date] = [];
      map[m.date].push(m);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [monthMovements]);

  const createBatch = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", "/api/inventory-movements/batch", payload),
    onSuccess: (result: any[]) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      const entradas = result.filter(r => r.type === "ENTRADA").length;
      const saidas = result.filter(r => r.type === "SAÍDA").length;
      const desc = [entradas > 0 ? `${entradas} entrada(s)` : "", saidas > 0 ? `${saidas} saída(s)` : ""].filter(Boolean).join(" + ");
      toast({ title: `${result.length} movimentação(ões) registrada(s)!`, description: `${desc} - ${fmtDate(batchDate)}` });
      setBatchItems([{ inventoryId: "", quantity: "", type: "ENTRADA", searchText: "", dropdownOpen: false }]);
      setBatchNotes("");
      setShowBatchForm(false);
    },
    onError: () => toast({ title: "Erro ao registrar", variant: "destructive" }),
  });

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = batchItems
      .filter(i => i.inventoryId && i.quantity && Number(i.quantity) > 0)
      .map(i => {
        const inv = (items as InventoryItem[]).find(it => it.id === Number(i.inventoryId));
        return { inventoryId: Number(i.inventoryId), productName: inv?.name || "", quantity: Number(i.quantity), type: i.type };
      });
    if (!validItems.length) { toast({ title: "Adicione pelo menos um item", variant: "destructive" }); return; }
    createBatch.mutate({ date: batchDate, items: validItems, notes: batchNotes || undefined });
  };

  // ---- Edit / Delete Movements ------------------------------------------------------------------------------------------
  const openEditMovement = (m: Movement) => {
    setEditMovement(m);
    setEditMovType(m.type as "ENTRADA" | "SAÍDA");
    setEditMovQty(String(m.quantity));
    setEditMovDate(m.date);
    setEditMovNotes(m.notes || "");
    setEditMovInventoryId(m.inventoryId);
  };

  const updateMovement = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => apiRequest("PUT", `/api/inventory-movements/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Movimentação atualizada!" });
      setEditMovement(null);
    },
    onError: (err: any) => toast({ title: `Erro ao editar: ${err.message || "Tente novamente."}`, variant: "destructive" }),
  });

  const deleteMovement = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/inventory-movements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Movimentação excluída e estoque ajustado." });
    },
    onError: (err: any) => toast({ title: `Erro ao excluir: ${err.message || "Tente novamente."}`, variant: "destructive" }),
  });

  const handleUpdateMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMovement || !editMovQty || Number(editMovQty) <= 0) return;
    const invItem = (items as InventoryItem[]).find(it => it.id === editMovInventoryId);
    updateMovement.mutate({
      id: editMovement.id,
      payload: {
        inventoryId: editMovInventoryId,
        productName: invItem?.name || editMovement.productName,
        type: editMovType,
        quantity: Number(editMovQty),
        date: editMovDate,
        notes: editMovNotes || undefined,
      },
    });
  };

  const handleDeleteMovement = (m: Movement) => {
    if (!confirm(`Excluir lançamento de "${m.productName}" (${m.type} ${m.quantity})?\nO estoque será revertido automaticamente.`)) return;
    deleteMovement.mutate(m.id);
  };

  // ---- Contagem Física Rápida (MODO COMPLETO) ------------------------------------------------------------
  const computeRapidaRows = (text: string, allItems: InventoryItem[]): RapidaRow[] => {
    const lines = text.split("\n");
    const rows: RapidaRow[] = [];

    // -- Parte 1: itens listados pelo usuário --
    for (const line of lines) {
      const parsed = parseCountLine(line);
      if (!parsed) continue;
      let best: InventoryItem | null = null;
      let bestScore = 0;
      for (const item of allItems) {
        const score = scoreMatch(parsed.name, item.name);
        if (score > bestScore) { bestScore = score; best = item; }
      }
      const diff = best ? parsed.qty - best.quantity : 0;
      rows.push({
        inputName: parsed.name,
        qty: parsed.qty,
        matchedItem: bestScore >= 30 ? best : null,
        confidence: bestScore,
        diff: bestScore >= 30 ? diff : 0,
        movType: bestScore >= 30 && diff !== 0 ? (diff > 0 ? "ENTRADA" : "SAÍDA") : null,
      });
    }

    // Deduplicação: quando o mesmo produto aparece mais de uma vez, SOMA as quantidades
    const seenMap = new Map<number, RapidaRow>();
    for (const row of rows) {
      if (row.matchedItem) {
        if (seenMap.has(row.matchedItem.id)) {
          const first = seenMap.get(row.matchedItem.id)!;
          first.qty += row.qty;
          first.diff = first.qty - first.matchedItem!.quantity;
          first.movType = first.diff !== 0 ? (first.diff > 0 ? "ENTRADA" : "SAÍDA") : null;
          first.inputName = `${first.inputName} + ${row.inputName}`;
          row.isDuplicate = true; row.movType = null; row.diff = 0;
        } else {
          seenMap.set(row.matchedItem.id, row);
        }
      }
    }

    // Parte 2: itens não listados serão zerados na contagem física completa.
    const countedIds = new Set<number>(
      rows.filter(r => r.matchedItem && !r.isDuplicate).map(r => r.matchedItem!.id)
    );
    const uncountedWithStock: RapidaRow[] = [];
    const uncountedZero: RapidaRow[] = [];

    for (const item of allItems) {
      if (countedIds.has(item.id)) continue;
      const row: RapidaRow = {
        inputName: "",
        qty: 0,
        matchedItem: item,
        confidence: 100,
        diff: -item.quantity,           // 0 - estoque atual
        movType: item.quantity > 0 ? "SAÍDA" : null,
        isUncounted: true,
      };
      if (item.quantity > 0) uncountedWithStock.push(row);
      else uncountedZero.push(row);
    }

    // Ordena: contados, itens a zerar e itens já zerados.
    return [...rows, ...uncountedWithStock, ...uncountedZero];
  };

  const processRapida = () => {
    const rows = computeRapidaRows(rapidaText, items as InventoryItem[]);
    if (rows.length === 0) {
      toast({ title: "Nenhuma linha válida encontrada", description: "Use o formato: 5x Nome ou Nome - Quantidade", variant: "destructive" });
      return;
    }
    setRapidaPreview(rows);
    setRapidaConfirmZerar(false);
    setRapidaApplied(false);
  };


  const applyRapida = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", "/api/inventory-movements/batch", payload),
    onSuccess: (result: any[]) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      const entradas = result.filter(r => r.type === "ENTRADA").length;
      const saidas = result.filter(r => r.type === "SAÍDA").length;
      toast({
        title: `Contagem aplicada! ${result.length} ajuste(s)`,
        description: `${entradas > 0 ? entradas + " entrada(s)" : ""}${entradas && saidas ? " + " : ""}${saidas > 0 ? saidas + " saída(s)" : ""}`,
      });
      setRapidaApplied(true);
      setRapidaText("");
      setRapidaPreview([]);
      setRapidaConfirmZerar(false);
    },
    onError: () => toast({ title: "Erro ao aplicar contagem", variant: "destructive" }),
  });

  const handleApplyRapida = () => {
    const validRows = rapidaPreview.filter(r => r.matchedItem && r.movType && r.diff !== 0 && !r.isDuplicate);
    if (validRows.length === 0) {
      toast({ title: "Nenhum ajuste a aplicar", description: "Todos os produtos já estão com o estoque correto.", variant: "destructive" });
      return;
    }
    if (rapidaToZeroRows.length > 0 && !rapidaConfirmZerar) {
      toast({
        title: "Confirme os itens que serão zerados",
        description: "Marque a confirmação antes de aplicar uma contagem física completa.",
        variant: "destructive",
      });
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const todayFmt = new Date().toLocaleDateString("pt-BR");
    const batchPayload = {
      date: today,
      notes: `Contagem Física Completa - ${todayFmt}`,
      items: validRows.map(r => ({
        inventoryId: r.matchedItem!.id,
        productName: r.matchedItem!.name,
        quantity: Math.abs(r.diff),
        type: r.movType!,
      })),
    };
    applyRapida.mutate(batchPayload);
  };

  const addBatchRow = () => setBatchItems(prev => [...prev, { inventoryId: "", quantity: "", type: "ENTRADA", searchText: "", dropdownOpen: false }]);
  const removeBatchRow = (i: number) => setBatchItems(prev => prev.filter((_, idx) => idx !== i));
  const updateBatchRow = (i: number, field: keyof BatchItem, val: string | boolean) =>
    setBatchItems(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  const selectBatchProduct = (i: number, item: InventoryItem) =>
    setBatchItems(prev => prev.map((row, idx) => idx === i ? { ...row, inventoryId: String(item.id), searchText: item.name, dropdownOpen: false } : row));
  const closeBatchDropdowns = (exceptIdx?: number) =>
    setBatchItems(prev => prev.map((row, idx) => idx === exceptIdx ? row : { ...row, dropdownOpen: false }));

  const navigateMonth = (dir: number) => {
    const [y, m] = selectedYM.split("-").map(Number);
    const date = new Date(y, m - 1 + dir, 1);
    setSelectedYM(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  // Inventory product form
  const filteredItems = (items as InventoryItem[]).filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.type || "").toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = (items as InventoryItem[]).filter(i => i.quantity <= i.minStock).length;
  const duplicateNameGroups = useMemo(() => {
    const groups = new Map<string, InventoryItem[]>();
    for (const item of items as InventoryItem[]) {
      const key = normName(item.name);
      groups.set(key, [...(groups.get(key) || []), item]);
    }
    return Array.from(groups.values()).filter(group => group.length > 1);
  }, [items]);

  const openNew = () => {
    setEditingItem(null);
    setName(""); setType("material"); setUnit("unid"); setQuantity(""); setMinStock("5"); setPrice("");
    setIsModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name); setType(item.type); setUnit(item.unit || "unid");
    setQuantity(item.quantity.toString()); setMinStock(item.minStock.toString());
    setPrice(item.pricePerUnit?.toString() || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, type, unit, quantity: Number(quantity) || 0, minStock: Number(minStock) || 0, pricePerUnit: Number(price) || 0 };
    if (editingItem) await updateItem.mutateAsync({ id: editingItem.id, ...payload });
    else await createItem.mutateAsync(payload);
    setIsModalOpen(false);
  };

  const historyMovements = historyItem ? (movements as Movement[]).filter(m => m.inventoryId === historyItem.id).sort((a, b) => b.date.localeCompare(a.date)) : [];

  const sortedInventory = (items as InventoryItem[]).sort((a, b) => a.name.localeCompare(b.name));

  // ---- Derived values for Contagem Física Completa preview ----
  const rapidaCountedRows  = rapidaPreview.filter(r => !r.isUncounted);
  const rapidaToZeroRows   = rapidaPreview.filter(r => r.isUncounted && !!r.matchedItem && r.movType === "SAÍDA");
  const rapidaAlreadyZero  = rapidaPreview.filter(r => r.isUncounted && !r.movType);
  const rapidaEntradas     = rapidaCountedRows.filter(r => r.movType === "ENTRADA" && !r.isDuplicate);
  const rapidaSaidasCont   = rapidaCountedRows.filter(r => r.movType === "SAÍDA" && !r.isDuplicate);
  const rapidaNoMatch      = rapidaCountedRows.filter(r => !r.matchedItem);
  const rapidaDupes        = rapidaCountedRows.filter(r => r.isDuplicate);
  const rapidaTotalAcoes   = rapidaEntradas.length + rapidaSaidasCont.length + rapidaToZeroRows.length;

  return (
    <div className="space-y-6">
      {activeTab === "produtos" && (
        <>
          <DuplicateProductsAlert duplicateNameGroups={duplicateNameGroups} />
          <InventoryProductList
            items={filteredItems}
            search={search}
            isLoading={isLoading}
            onSearchChange={setSearch}
            onHistory={setHistoryItem}
            onEdit={openEdit}
            onDelete={item => { if (confirm("Deletar?")) deleteItem.mutate(item.id); }}
          />
        </>
      )}
      {/* --- TAB: MOVIMENTAÇÕES --- */}
      {activeTab === "movimentacoes" && (
        <div className="space-y-4">
          <InventoryMovementHistory
            selectedYM={selectedYM}
            availableMonths={availableMonths}
            monthLabel={ymLabel}
            monthMovements={monthMovements}
            groupedByDay={groupedByDay}
            movSearch={movSearch}
            onMonthChange={setSelectedYM}
            onNavigateMonth={navigateMonth}
            onSearchChange={setMovSearch}
            onDownloadPdf={() => generateMovementPDF(selectedYM, movements as Movement[], items as InventoryItem[])}
            onNewMovement={() => {
              setShowBatchForm(value => !value);
              if (!showBatchForm) {
                setBatchDate(new Date().toISOString().split("T")[0]);
                setBatchItems([{ inventoryId: "", quantity: "", type: "ENTRADA", searchText: "", dropdownOpen: false }]);
                setBatchNotes("");
              }
            }}
            onEditMovement={openEditMovement}
            onDeleteMovement={handleDeleteMovement}
            formatDate={fmtDate}
            isDeleting={deleteMovement.isPending}
          />

          {showBatchForm && (
            <InventoryMovementForm
              items={sortedInventory}
              batchItems={batchItems}
              batchDate={batchDate}
              batchNotes={batchNotes}
              isPending={createBatch.isPending}
              onSubmit={handleBatchSubmit}
              onClose={() => setShowBatchForm(false)}
              onDateChange={setBatchDate}
              onNotesChange={setBatchNotes}
              onAddRow={addBatchRow}
              onRemoveRow={removeBatchRow}
              onUpdateRow={updateBatchRow}
              onSelectProduct={selectBatchProduct}
              onCloseDropdowns={closeBatchDropdowns}
              formatDate={fmtDate}
            />
          )}
        </div>
      )}
      {/* --- TAB: CONTAGEM FÍSICA RÁPIDA ------ */}
      {activeTab === "rapida" && (
        <div className="space-y-5">
          <QuickCountPanel
            text={rapidaText}
            applied={rapidaApplied}
            canProcess={!!rapidaText.trim()}
            onTextChange={value => { setRapidaText(value); setRapidaPreview([]); setRapidaConfirmZerar(false); }}
            onClear={() => { setRapidaText(""); setRapidaPreview([]); setRapidaConfirmZerar(false); setRapidaApplied(false); }}
            onProcess={processRapida}
          />
          {rapidaPreview.length > 0 && (
            <QuickCountPreview
              countedRows={rapidaCountedRows}
              toZeroRows={rapidaToZeroRows}
              alreadyZeroRows={rapidaAlreadyZero}
              entradas={rapidaEntradas}
              saidas={rapidaSaidasCont}
              noMatch={rapidaNoMatch}
              duplicates={rapidaDupes}
              totalActions={rapidaTotalAcoes}
              confirmZero={rapidaConfirmZerar}
              isApplying={applyRapida.isPending}
              onConfirmZeroChange={setRapidaConfirmZerar}
              onApply={handleApplyRapida}
            />
          )}
        </div>
      )}

      {/* Edit/Create Item Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "Editar Item" : "Adicionar Item"}>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Input label="Nome do Produto *" required value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Viaplus 1000" data-testid="input-item-name" />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Categoria</label>
              <select value={type} onChange={e => setType(e.target.value)} className="px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-border focus:outline-none focus:border-primary transition-all" data-testid="select-item-type">
                <option value="material">Material</option>
                <option value="ferramenta">Ferramenta</option>
                <option value="equipamento">Equipamento</option>
                <option value="epi">EPI</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Unidade</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className="px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-border focus:outline-none focus:border-primary transition-all" data-testid="select-item-unit">
                <option value="unid">unid</option>
                <option value="rolo">rolo</option>
                <option value="balde">balde</option>
                <option value="kg">kg</option>
                <option value="lt">lt</option>
                <option value="cx">cx</option>
                <option value="saco">saco</option>
                <option value="m²">m²</option>
                <option value="m">m</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantidade" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" data-testid="input-item-qty" />
            <Input label="Estoque Mínimo" type="number" value={minStock} onChange={e => setMinStock(e.target.value)} placeholder="5" data-testid="input-item-min" />
          </div>
          <Input label="Preço Unitário (R$)" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0,00" data-testid="input-item-price" />
          <div className="pt-4 flex justify-end gap-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={createItem.isPending || updateItem.isPending} data-testid="button-submit-item">Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" data-testid="modal-history">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Histórico de Movimentações</h2>
                <p className="text-sm text-slate-500 mt-0.5">{historyItem.name}</p>
              </div>
              <button onClick={() => setHistoryItem(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="flex items-center gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
              <span className="text-sm text-slate-600">Entradas: <strong>{historyMovements.filter(m => m.type === "ENTRADA").reduce((s, m) => s + m.quantity, 0)}</strong></span>
              <span className="text-sm text-slate-600">Saídas: <strong>{historyMovements.filter(m => m.type === "SAÍDA").reduce((s, m) => s + m.quantity, 0)}</strong></span>
              <span className="ml-auto text-sm text-slate-600">Saldo atual: <strong className="text-slate-900">{historyItem.quantity} {historyItem.unit || "unid"}</strong></span>
            </div>
            <div className="overflow-y-auto flex-1">
              {historyMovements.length === 0 ? (
                <div className="text-center py-12 text-slate-400"><History className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhuma movimentação registrada</p></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white"><tr className="text-xs font-semibold uppercase text-slate-500 border-b border-slate-100"><th className="px-6 py-3 text-left">Data</th><th className="px-4 py-3 text-left">Mês</th><th className="px-4 py-3 text-left">Tipo</th><th className="px-4 py-3 text-right">Qtd</th><th className="px-4 py-3 text-left">Obs.</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {historyMovements.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-slate-600 font-mono text-xs">{fmtDate(m.date)}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{m.month}</td>
                        <td className="px-4 py-3">
                          {m.type === "ENTRADA"
                            ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><TrendingUp className="w-3 h-3" /> ENTRADA</span>
                            : <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><TrendingDown className="w-3 h-3" /> SAÍDA</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{m.quantity}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{m.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200"><Button variant="ghost" onClick={() => setHistoryItem(null)} className="w-full">Fechar</Button></div>
          </div>
        </div>
      )}

      {/* ------ Edit Movement Modal ------ */}
      {editMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" data-testid="modal-edit-movement">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Editar Movimentação</h2>
              <button onClick={() => setEditMovement(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleUpdateMovement} className="p-6 space-y-4">
              {/* Product selector */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Produto</label>
                <select
                  value={editMovInventoryId}
                  onChange={e => {
                    const id = Number(e.target.value);
                    setEditMovInventoryId(id);
                  }}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 transition-all"
                  data-testid="select-edit-movement-product"
                >
                  <option value={0}>Selecionar produto...</option>
                  {(items as InventoryItem[]).sort((a, b) => a.name.localeCompare(b.name)).map(it => (
                    <option key={it.id} value={it.id}>{it.name} - {it.unit || "unid"} (estoque: {it.quantity})</option>
                  ))}
                </select>
              </div>

              {/* Type toggle */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tipo</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditMovType("ENTRADA")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${editMovType === "ENTRADA" ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-500 hover:border-green-300"}`}
                    data-testid="button-edit-mov-entrada"
                  >
                    <TrendingUp className="w-4 h-4" /> ENTRADA
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMovType("SAÍDA")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${editMovType === "SAÍDA" ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-500 hover:border-red-300"}`}
                    data-testid="button-edit-mov-saida"
                  >
                    <TrendingDown className="w-4 h-4" /> SAÍDA
                  </button>
                </div>
              </div>

              {/* Quantity + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={editMovQty}
                    onChange={e => setEditMovQty(e.target.value)}
                    required
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 transition-all"
                    data-testid="input-edit-movement-qty"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Data</label>
                  <input
                    type="date"
                    value={editMovDate}
                    onChange={e => setEditMovDate(e.target.value)}
                    required
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 transition-all"
                    data-testid="input-edit-movement-date"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Observação <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input
                  type="text"
                  value={editMovNotes}
                  onChange={e => setEditMovNotes(e.target.value)}
                  placeholder="Ex: Compra de fevereiro, uso na obra X..."
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50 transition-all"
                  data-testid="input-edit-movement-notes"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                O estoque será recalculado automaticamente ao salvar (a movimentação anterior é revertida e a nova é aplicada).
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setEditMovement(null)}>Cancelar</Button>
                <Button type="submit" isLoading={updateMovement.isPending} className="flex-1" data-testid="button-save-edit-movement">Salvar Alterações</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
