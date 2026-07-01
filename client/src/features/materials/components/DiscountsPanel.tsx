import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, ShieldCheck, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fmtDate } from "@/features/materials/material-control-utils";
import type { DiscountRule, SalaryDiscount } from "@/features/materials/types";

function conditionText(condition: string) {
  if (condition === "bom") return "Bom";
  if (condition === "manutencao") return "Manutenção";
  return condition === "perdido" ? "Perdido" : "Danificado";
}

export function DiscountsPanel({
  discountRules,
  salaryDiscounts,
  loadingRules,
  loadingDiscounts,
}: {
  discountRules: DiscountRule[];
  salaryDiscounts: SalaryDiscount[];
  loadingRules: boolean;
  loadingDiscounts: boolean;
}) {
  const { toast } = useToast();
  const [editingRule, setEditingRule] = useState<Partial<DiscountRule> | null>(null);
  const [approveDiscount, setApproveDiscount] = useState<{ id: number; amount: string; notes: string } | null>(null);
  const pendingDiscounts = salaryDiscounts.filter(discount => discount.status === "pendente");
  const resolvedDiscounts = salaryDiscounts.filter(discount => discount.status !== "pendente");

  const createRuleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/salary-discount-rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-discount-rules"] });
      setEditingRule(null);
      toast({ title: "Regra criada", description: "A regra de desconto foi salva." });
    },
    onError: (err: any) => toast({ title: "Erro ao salvar regra", description: err.message, variant: "destructive" }),
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/salary-discount-rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-discount-rules"] });
      setEditingRule(null);
      toast({ title: "Regra atualizada", description: "As alterações foram salvas." });
    },
    onError: (err: any) => toast({ title: "Erro ao atualizar regra", description: err.message, variant: "destructive" }),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/salary-discount-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-discount-rules"] });
      toast({ title: "Regra removida" });
    },
    onError: (err: any) => toast({ title: "Erro ao remover regra", description: err.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, discountAmount, notes }: { id: number; discountAmount: number; notes: string }) =>
      apiRequest("PATCH", `/api/salary-discounts/${id}/approve`, { discountAmount, notes, approvedBy: "Admin" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-discounts"] });
      toast({ title: "Desconto aprovado" });
      setApproveDiscount(null);
    },
    onError: (err: any) => toast({ title: "Erro ao aprovar desconto", description: err.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/salary-discounts/${id}/reject`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-discounts"] });
      toast({ title: "Desconto rejeitado" });
    },
    onError: (err: any) => toast({ title: "Erro ao rejeitar desconto", description: err.message, variant: "destructive" }),
  });

  const saveRule = () => {
    if (!editingRule?.name) {
      toast({ title: "Informe o nome da regra", description: "Use um nome simples para identificar o desconto.", variant: "destructive" });
      return;
    }

    if (editingRule.id) updateRuleMutation.mutate({ id: editingRule.id, data: editingRule });
    else createRuleMutation.mutate(editingRule);
  };

  const createDefaultRules = async () => {
    const existingConditions = new Set(discountRules.map(rule => rule.condition));
    const defaults = [
      { name: "Ferramenta danificada - revisar valor", condition: "danificado", discountType: "percentual", discountValue: 50, active: true },
      { name: "Ferramenta perdida - revisar valor", condition: "perdido", discountType: "percentual", discountValue: 100, active: true },
    ].filter(rule => !existingConditions.has(rule.condition));
    if (defaults.length === 0) {
      toast({ title: "Regras padrão já existem", description: "Danificado e perdido já possuem regras configuradas." });
      return;
    }
    try {
      await Promise.all(defaults.map(rule => apiRequest("POST", "/api/salary-discount-rules", rule)));
      queryClient.invalidateQueries({ queryKey: ["/api/salary-discount-rules"] });
      toast({ title: "Regras padrão criadas", description: "As sugestões iniciais foram salvas para revisão do Admin." });
    } catch (err: any) {
      toast({ title: "Erro ao criar regras padrão", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <ShieldCheck className="h-5 w-5" /> Descontos pendentes de aprovação
            {pendingDiscounts.length > 0 && <Badge className="bg-red-500 text-white">{pendingDiscounts.length}</Badge>}
          </h2>
        </div>

        {loadingDiscounts ? (
          <Card><CardContent className="py-8 text-center text-sm text-gray-400">Carregando descontos...</CardContent></Card>
        ) : pendingDiscounts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <ShieldCheck className="mx-auto mb-2 h-10 w-10 text-green-500" />
              <p className="font-medium">Nenhum desconto pendente de aprovação</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingDiscounts.map(discount => (
              <Card key={discount.id} className="border-yellow-200" data-testid={`card-discount-${discount.id}`}>
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{discount.username}</span>
                        <Badge className={discount.condition === "perdido" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>
                          {conditionText(discount.condition)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">Material: <span className="font-medium">{discount.productName}</span></p>
                      <p className="text-xs text-gray-400">Saída #{discount.withdrawalId} · {fmtDate(discount.createdAt)}</p>
                      {discount.ruleName && <p className="text-xs text-gray-400">Regra: {discount.ruleName}</p>}
                    </div>

                    {approveDiscount?.id === discount.id ? (
                      <div className="grid w-full gap-2 sm:w-52">
                        <Input
                          type="number"
                          placeholder="Valor (R$)"
                          value={approveDiscount.amount}
                          onChange={event => setApproveDiscount(prev => prev ? { ...prev, amount: event.target.value } : null)}
                        />
                        <Input
                          placeholder="Observação"
                          value={approveDiscount.notes}
                          onChange={event => setApproveDiscount(prev => prev ? { ...prev, notes: event.target.value } : null)}
                        />
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 text-white"
                            onClick={() => approveMutation.mutate({ id: discount.id, discountAmount: Number(approveDiscount.amount), notes: approveDiscount.notes })}
                            disabled={approveMutation.isPending}
                            data-testid={`button-confirm-approve-${discount.id}`}
                          >
                            Confirmar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setApproveDiscount(null)}><X className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:flex">
                        <Button
                          size="sm"
                          className="bg-green-600 text-white"
                          onClick={() => setApproveDiscount({ id: discount.id, amount: "0", notes: "" })}
                          data-testid={`button-approve-${discount.id}`}
                        >
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600"
                          onClick={() => rejectMutation.mutate(discount.id)}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-${discount.id}`}
                        >
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {resolvedDiscounts.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-700">Histórico de descontos</h3>
          <div className="space-y-2">
            {resolvedDiscounts.map(discount => (
              <Card key={discount.id} className="border-gray-200" data-testid={`card-discount-history-${discount.id}`}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{discount.username}</span>
                        <Badge variant="outline" className="text-xs">{conditionText(discount.condition)}</Badge>
                      </div>
                      <p className="truncate text-xs text-gray-500">{discount.productName} · Saída #{discount.withdrawalId}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge className={discount.status === "aprovado" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                        {discount.status === "aprovado" ? `R$ ${discount.discountAmount}` : "Rejeitado"}
                      </Badge>
                      {discount.approvedBy && <p className="mt-0.5 text-xs text-gray-400">por {discount.approvedBy}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-gray-700">Regras de desconto</h3>
          <Button
            size="sm"
            onClick={() => setEditingRule({ name: "", condition: "perdido", discountType: "fixo", discountValue: 0, active: true })}
            data-testid="button-add-rule"
          >
            <Plus className="mr-1 h-3 w-3" /> Nova regra
          </Button>
          <Button size="sm" variant="outline" onClick={createDefaultRules} data-testid="button-create-default-discount-rules">
            Regras padrão
          </Button>
        </div>

        {loadingRules ? (
          <Card><CardContent className="py-8 text-center text-sm text-gray-400">Carregando regras...</CardContent></Card>
        ) : discountRules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-400">
              Nenhuma regra configurada. As regras definem descontos automáticos para materiais perdidos ou danificados.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {discountRules.map(rule => (
              <Card key={rule.id} className={`border ${!rule.active ? "opacity-60" : ""}`} data-testid={`card-rule-${rule.id}`}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{rule.name}</p>
                      <p className="text-xs text-gray-500">
                        {conditionText(rule.condition)} · {rule.discountType === "fixo" ? `R$ ${rule.discountValue}` : `${rule.discountValue}%`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={rule.active ? "text-green-700" : "text-gray-400"}>{rule.active ? "Ativa" : "Inativa"}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => setEditingRule(rule)} data-testid={`button-edit-rule-${rule.id}`}>Editar</Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteRuleMutation.mutate(rule.id)} data-testid={`button-delete-rule-${rule.id}`}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["Bom", "Sem desconto. Volta para disponivel.", "border-green-200 bg-green-50 text-green-800"],
          ["Manutencao", "Sem desconto automatico. Admin decide depois.", "border-blue-200 bg-blue-50 text-blue-800"],
          ["Danificado", "Gera responsabilidade pendente se houver regra ativa.", "border-amber-200 bg-amber-50 text-amber-800"],
          ["Perdido", "Gera responsabilidade pendente se houver regra ativa.", "border-red-200 bg-red-50 text-red-800"],
        ].map(([title, description, classes]) => (
          <Card key={title} className={classes}>
            <CardContent className="p-3">
              <p className="text-sm font-bold">{title}</p>
              <p className="mt-1 text-xs">{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {editingRule !== null && (
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">{editingRule.id ? "Editar regra" : "Nova regra de desconto"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Nome da regra</Label>
              <Input value={editingRule.name || ""} onChange={event => setEditingRule(rule => rule ? { ...rule, name: event.target.value } : null)} placeholder="Ex: Perda de material" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Condição</Label>
                <Select value={editingRule.condition || "perdido"} onValueChange={value => setEditingRule(rule => rule ? { ...rule, condition: value } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bom">Bom</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                    <SelectItem value="danificado">Danificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo de desconto</Label>
                <Select value={editingRule.discountType || "fixo"} onValueChange={value => setEditingRule(rule => rule ? { ...rule, discountType: value } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Valor</Label>
              <Input type="number" min="0" step="0.01" value={editingRule.discountValue || 0} onChange={event => setEditingRule(rule => rule ? { ...rule, discountValue: parseFloat(event.target.value) || 0 } : null)} />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <Button variant="outline" onClick={() => setEditingRule(null)}>Cancelar</Button>
              <Button onClick={saveRule} disabled={createRuleMutation.isPending || updateRuleMutation.isPending}>Salvar regra</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
