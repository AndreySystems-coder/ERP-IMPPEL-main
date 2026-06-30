import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ClipboardPaste, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InventoryItem, UserItem } from "@/features/materials/types";

type PreviewItem = { raw: string; inventoryId: number | null; quantity: number; confidence: number };
type PreviewEntry = { raw: string; date: string; userId: number | null; userConfidence: number; items: PreviewItem[] };

function normalize(value: string) {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function matchScore(query: string, candidate: string) {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (q.includes(c) || c.includes(q)) return 85;
  const words = q.split(" ").filter(word => word.length > 1);
  const matched = words.filter(word => c.split(" ").some(candidateWord => candidateWord === word || candidateWord.includes(word) || word.includes(candidateWord))).length;
  return words.length ? Math.round((matched / words.length) * 70) : 0;
}

function bestMatch<T>(query: string, values: T[], label: (value: T) => string) {
  return values.reduce<{ value: T | null; score: number }>((best, value) => {
    const score = matchScore(query, label(value));
    return score > best.score ? { value, score } : best;
  }, { value: null, score: 0 });
}

function userSearchLabel(user: UserItem) {
  return [user.username, user.fullName, user.jobTitle, user.roleLabel].filter(Boolean).join(" ");
}

function parseItem(raw: string) {
  const text = raw.trim();
  let match = text.match(/^(\d+)\s*x\s*(.+)$/i);
  if (match) return { name: match[2].trim(), quantity: Number(match[1]) };
  match = text.match(/^(.+?)\s+x?\s*(\d+)$/i);
  if (match) return { name: match[1].trim(), quantity: Number(match[2]) };
  return { name: text, quantity: 1 };
}

export function QuickMaterialRegistration({ inventory, users }: { inventory: InventoryItem[]; users: UserItem[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<PreviewEntry[]>([]);

  const unresolved = useMemo(() => preview.reduce((total, entry) => total + (entry.userId ? 0 : 1) + entry.items.filter(item => !item.inventoryId).length, 0), [preview]);
  const valid = preview.length > 0 && unresolved === 0 && preview.every(entry => entry.items.length > 0);

  const createMutation = useMutation({
    mutationFn: (entries: PreviewEntry[]) => apiRequest("POST", "/api/material-withdrawals/quick", {
      entries: entries.map(entry => ({ date: entry.date, userId: entry.userId, items: entry.items.map(item => ({ inventoryId: item.inventoryId, quantity: item.quantity })) })),
    }).then(response => response.json()),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      toast({ title: "Registro rápido aplicado", description: `${result.created} retirada(s) criada(s) com origem auditável.` });
      setText("");
      setPreview([]);
    },
    onError: (error: Error) => toast({ title: "Não foi possível aplicar", description: error.message, variant: "destructive" }),
  });

  const buildPreview = () => {
    const entries: PreviewEntry[] = [];
    const fallbackYear = new Date().getFullYear();
    let currentDate = new Date().toISOString().slice(0, 10);
    for (const line of text.split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
      const dateMatch = line.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
      if (dateMatch) {
        const rawYear = dateMatch[3] ? Number(dateMatch[3]) : fallbackYear;
        const year = rawYear < 100 ? 2000 + rawYear : rawYear;
        currentDate = `${year}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`;
        continue;
      }
      const separator = line.match(/^(.+?)\s*[-–:]\s*(.+)$/);
      const employeeText = separator?.[1]?.trim() || "";
      const itemText = separator?.[2]?.trim() || "";
      const employee = bestMatch(employeeText, users.filter(user => user.role !== "admin"), userSearchLabel);
      const items = itemText.split(/[,;]/).map(parseItem).filter(item => item.name).map(item => {
        const material = bestMatch(item.name, inventory, value => value.name);
        return { raw: item.name, inventoryId: material.score >= 70 ? material.value?.id || null : null, quantity: Math.max(1, item.quantity), confidence: material.score };
      });
      entries.push({ raw: line, date: currentDate, userId: employee.score >= 70 ? employee.value?.id || null : null, userConfidence: employee.score, items });
    }
    setPreview(entries);
  };

  const updateEntry = (entryIndex: number, patch: Partial<PreviewEntry>) => setPreview(current => current.map((entry, index) => index === entryIndex ? { ...entry, ...patch } : entry));
  const updateItem = (entryIndex: number, itemIndex: number, patch: Partial<PreviewItem>) => setPreview(current => current.map((entry, index) => index === entryIndex ? { ...entry, items: entry.items.map((item, innerIndex) => innerIndex === itemIndex ? { ...item, ...patch } : item) } : entry));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardPaste className="h-4 w-4" /> Registro Rápido de Materiais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={text} onChange={event => { setText(event.target.value); setPreview([]); }} rows={7} placeholder={"Elias - marreta, talhadeira, 2x broxa\n20/06\nJoão - manta líquida, rolo, trincha"} data-testid="textarea-quick-materials" />
          <Button onClick={buildPreview} disabled={!text.trim()} className="w-full sm:w-auto" data-testid="button-preview-quick-materials"><ClipboardPaste className="mr-2 h-4 w-4" /> Gerar preview</Button>
        </CardContent>
      </Card>

      {preview.length > 0 && (
        <div className="space-y-3">
          {preview.map((entry, entryIndex) => (
            <Card key={`${entry.raw}-${entryIndex}`} className={entry.userId && entry.items.every(item => item.inventoryId) ? "border-emerald-200" : "border-amber-300"}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {entry.userId ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                  <span className="min-w-0 flex-1 truncate">{entry.raw}</span>
                </div>
                <label className="block text-xs font-semibold text-slate-500">Data da retirada
                  <input type="date" value={entry.date} onChange={event => updateEntry(entryIndex, { date: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" data-testid={`input-quick-date-${entryIndex}`} />
                </label>
                <select value={entry.userId || ""} onChange={event => updateEntry(entryIndex, { userId: Number(event.target.value) || null })} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" data-testid={`select-quick-user-${entryIndex}`}>
                  <option value="">{entry.userConfidence >= 35 ? `Funcionário duvidoso (${entry.userConfidence}%)` : "Funcionário não reconhecido"}</option>
                  {users.filter(user => user.role !== "admin").map(user => <option key={user.id} value={user.id}>{user.username}</option>)}
                </select>
                <div className="space-y-2">
                  {entry.items.map((item, itemIndex) => (
                    <div key={`${item.raw}-${itemIndex}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_90px_40px]">
                      <select value={item.inventoryId || ""} onChange={event => updateItem(entryIndex, itemIndex, { inventoryId: Number(event.target.value) || null })} className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm">
                        <option value="">{item.confidence >= 35 ? `Material duvidoso (${item.confidence}%): ${item.raw}` : `Não reconhecido: ${item.raw}`}</option>
                        {inventory.map(material => <option key={material.id} value={material.id}>{material.name} ({material.quantity} {material.unit})</option>)}
                      </select>
                      <input type="number" min="1" value={item.quantity} onChange={event => updateItem(entryIndex, itemIndex, { quantity: Math.max(1, Number(event.target.value)) })} className="h-10 rounded-md border border-slate-200 px-3 text-sm" aria-label="Quantidade" />
                      <Button variant="ghost" size="icon" onClick={() => updateEntry(entryIndex, { items: entry.items.filter((_, index) => index !== itemIndex) })} title="Remover item"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => updateEntry(entryIndex, { items: [...entry.items, { raw: "Novo item", inventoryId: null, quantity: 1, confidence: 0 }] })}><Plus className="mr-1 h-4 w-4" /> Adicionar item</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {unresolved > 0 && <p className="text-sm font-medium text-amber-700">Revise {unresolved} correspondência(s) antes de confirmar. Nada foi aplicado ainda.</p>}
          <Button onClick={() => createMutation.mutate(preview)} disabled={!valid || createMutation.isPending} className="w-full bg-emerald-700 hover:bg-emerald-800" data-testid="button-apply-quick-materials">Confirmar e criar retiradas</Button>
        </div>
      )}
    </div>
  );
}
