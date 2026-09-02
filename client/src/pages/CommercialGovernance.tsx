import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronDown, ClipboardCheck, FilePlus2, Route, Scale, TrendingDown, WalletCards, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type CommercialRow = Record<string, any>;

const endpoints = [
  "/api/commercial/policies",
  "/api/commercial/discount-requests",
  "/api/commercial/commissions",
  "/api/commercial/logistics",
  "/api/commercial/quote-versions",
  "/api/commercial/scope-changes",
  "/api/commercial/indicators",
];

function currency(value: unknown) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percent(value: unknown) {
  return `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function invalidateCommercialQueries() {
  endpoints.forEach(endpoint => queryClient.invalidateQueries({ queryKey: [endpoint] }));
}

function useCommercialPost(endpoint: string, success: string) {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: CommercialRow) => {
      const response = await apiRequest("POST", endpoint, payload);
      return response.json();
    },
    onSuccess: () => {
      invalidateCommercialQueries();
      toast({ title: success });
    },
    onError: (error: Error) => toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" }),
  });
}

function StatusBadge({ status }: { status?: string }) {
  const value = status || "pendente";
  const variant = value === "aprovado" || value === "ativo" ? "default" : value === "rejeitado" ? "destructive" : "secondary";
  return <Badge variant={variant}>{value}</Badge>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export default function CommercialGovernance() {
  const { toast } = useToast();
  const [showIndicators, setShowIndicators] = useState(false);
  const [policy, setPolicy] = useState({ name: "", type: "desconto", notes: "" });
  const [discount, setDiscount] = useState({ jobId: "", originalPrice: "", requestedPrice: "", reason: "" });
  const [commission, setCommission] = useState({ jobId: "", username: "", baseAmount: "", percent: "", fixedAmount: "" });
  const [logistics, setLogistics] = useState({ jobId: "", distanceKm: "", trips: "1", costPerKm: "", tolls: "", parking: "", meals: "", lodging: "", otherCosts: "", manualAdjustmentReason: "" });
  const [quoteVersion, setQuoteVersion] = useState({ jobId: "", versionNumber: "1", status: "rascunho", scopeIncluded: "", scopeExcluded: "", assumptions: "" });
  const [scopeChange, setScopeChange] = useState({ jobId: "", workOrderId: "", description: "", financialImpact: "", scheduleImpact: "" });

  const policies = useQuery<CommercialRow[]>({ queryKey: ["/api/commercial/policies"] });
  const discounts = useQuery<CommercialRow[]>({ queryKey: ["/api/commercial/discount-requests"] });
  const commissions = useQuery<CommercialRow[]>({ queryKey: ["/api/commercial/commissions"] });
  const logisticsRows = useQuery<CommercialRow[]>({ queryKey: ["/api/commercial/logistics"] });
  const quoteVersions = useQuery<CommercialRow[]>({ queryKey: ["/api/commercial/quote-versions"] });
  const scopeChanges = useQuery<CommercialRow[]>({ queryKey: ["/api/commercial/scope-changes"] });
  const indicators = useQuery<CommercialRow>({ queryKey: ["/api/commercial/indicators"] });

  const createPolicy = useCommercialPost("/api/commercial/policies", "Política registrada");
  const createDiscount = useCommercialPost("/api/commercial/discount-requests", "Solicitação de desconto registrada");
  const createCommission = useCommercialPost("/api/commercial/commissions", "Comissão registrada");
  const createLogistics = useCommercialPost("/api/commercial/logistics", "Logística registrada");
  const createQuoteVersion = useCommercialPost("/api/commercial/quote-versions", "Versão de orçamento registrada");
  const createScopeChange = useCommercialPost("/api/commercial/scope-changes", "Aditivo registrado");

  const decideMutation = useMutation({
    mutationFn: async ({ endpoint, decisionNotes }: { endpoint: string; decisionNotes?: string }) => {
      const response = await apiRequest("POST", endpoint, { decisionNotes });
      return response.json();
    },
    onSuccess: () => {
      invalidateCommercialQueries();
      toast({ title: "Decisão registrada" });
    },
    onError: (error: Error) => toast({ title: "Falha na decisão", description: error.message, variant: "destructive" }),
  });

  const commercialRisk = useMemo(() => {
    const pending = Number(indicators.data?.pendingDiscounts || 0) + Number(indicators.data?.pendingScopeChanges || 0);
    return pending > 0 ? "pendente" : "estável";
  }, [indicators.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Governança Comercial</h1>
        <p className="text-sm text-muted-foreground">Regras, alçadas, descontos, comissões, logística, versões e aditivos sem inventar percentuais oficiais da IMPPEL.</p>
      </div>

      <Card className="border-blue-100 bg-blue-50/60">
        <CardContent className="grid gap-3 p-4 text-sm text-blue-950 md:grid-cols-3">
          <InfoBlock title="Para que serve?" text="Controlar exceções comerciais antes que desconto, comissão ou custo extra vire decisão sem registro." />
          <InfoBlock title="Como usar?" text="Cadastre regras como rascunho, registre solicitações e aprove/rejeite com histórico administrativo." />
          <InfoBlock title="Próximo passo" text="Definir com a direção as alçadas reais, limites e responsáveis antes do uso definitivo em produção." />
        </CardContent>
      </Card>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowIndicators(value => !value)}
          className="gap-2"
          data-testid="button-toggle-indicadores"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showIndicators ? "rotate-180" : ""}`} />
          {showIndicators ? "Ocultar indicadores comerciais" : "Ver indicadores comerciais"}
        </Button>
        {showIndicators && (
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><TrendingDown className="h-4 w-4" /> Margem Média</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{percent(indicators.data?.averageMargin)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Scale className="h-4 w-4" /> Descontos Pendentes</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{indicators.data?.pendingDiscounts || 0}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><WalletCards className="h-4 w-4" /> Comissões Previstas</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{currency(indicators.data?.commissionForecast)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4" /> Risco Comercial</CardTitle></CardHeader>
              <CardContent><StatusBadge status={commercialRisk} /></CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" /> Políticas Comerciais</CardTitle>
            <CardDescription>Cadastre regras configuráveis para decisão posterior da IMPPEL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Nome"><Input value={policy.name} onChange={event => setPolicy({ ...policy, name: event.target.value })} /></Field>
              <Field label="Tipo">
                <Select value={policy.type} onValueChange={value => setPolicy({ ...policy, type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["desconto", "comissao", "logistica", "pagamento", "alcada", "margem"].map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status"><Input value="rascunho" readOnly /></Field>
            </div>
            <Field label="Observação"><Textarea value={policy.notes} onChange={event => setPolicy({ ...policy, notes: event.target.value })} /></Field>
            <Button onClick={() => createPolicy.mutate({ ...policy, status: "rascunho" })} disabled={!policy.name || createPolicy.isPending}>Registrar política</Button>
            <div className="space-y-2">
              {(policies.data || []).slice(0, 5).map(row => (
                <div key={row.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>{row.name} <span className="text-muted-foreground">({row.type})</span></span>
                  <StatusBadge status={row.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4" /> Descontos e Alçadas</CardTitle>
            <CardDescription>Solicitações ficam pendentes até decisão administrativa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Orçamento ID"><Input value={discount.jobId} onChange={event => setDiscount({ ...discount, jobId: event.target.value })} inputMode="numeric" /></Field>
              <Field label="Preço original"><Input value={discount.originalPrice} onChange={event => setDiscount({ ...discount, originalPrice: event.target.value })} inputMode="decimal" /></Field>
              <Field label="Preço solicitado"><Input value={discount.requestedPrice} onChange={event => setDiscount({ ...discount, requestedPrice: event.target.value })} inputMode="decimal" /></Field>
            </div>
            <Field label="Motivo"><Textarea value={discount.reason} onChange={event => setDiscount({ ...discount, reason: event.target.value })} /></Field>
            <Button onClick={() => createDiscount.mutate({ ...discount })} disabled={!discount.jobId || !discount.reason || createDiscount.isPending}>Solicitar desconto</Button>
            <div className="space-y-2">
              {(discounts.data || []).slice(0, 6).map(row => (
                <div key={row.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Orçamento #{row.jobId} · {currency(row.discountAmount)} · {percent(row.discountPercent)}</span>
                    <StatusBadge status={row.status} />
                  </div>
                  {row.status === "pendente" && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => decideMutation.mutate({ endpoint: `/api/commercial/discount-requests/${row.id}/approve` })}><CheckCircle2 className="mr-1 h-4 w-4" /> Aprovar</Button>
                      <Button size="sm" variant="outline" onClick={() => decideMutation.mutate({ endpoint: `/api/commercial/discount-requests/${row.id}/reject` })}><XCircle className="mr-1 h-4 w-4" /> Rejeitar</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><WalletCards className="h-4 w-4" /> Comissões</CardTitle>
            <CardDescription>Registre previsão e acompanhe liberação conforme recebimento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-5">
              <Field label="Orçamento ID"><Input value={commission.jobId} onChange={event => setCommission({ ...commission, jobId: event.target.value })} /></Field>
              <Field label="Responsável"><Input value={commission.username} onChange={event => setCommission({ ...commission, username: event.target.value })} /></Field>
              <Field label="Base"><Input value={commission.baseAmount} onChange={event => setCommission({ ...commission, baseAmount: event.target.value })} /></Field>
              <Field label="%"><Input value={commission.percent} onChange={event => setCommission({ ...commission, percent: event.target.value })} /></Field>
              <Field label="Fixo"><Input value={commission.fixedAmount} onChange={event => setCommission({ ...commission, fixedAmount: event.target.value })} /></Field>
            </div>
            <Button onClick={() => createCommission.mutate({ ...commission })} disabled={!commission.jobId || createCommission.isPending}>Registrar comissão</Button>
            <div className="grid gap-2 sm:grid-cols-2">
              {(commissions.data || []).slice(0, 4).map(row => (
                <div key={row.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{row.username || "Sem responsável"}</div>
                  <div className="text-muted-foreground">Orçamento #{row.jobId} · {currency(row.commissionAmount)}</div>
                  <StatusBadge status={row.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Route className="h-4 w-4" /> Logística</CardTitle>
            <CardDescription>Calcule deslocamentos e custos regionais por orçamento/OS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Orçamento ID"><Input value={logistics.jobId} onChange={event => setLogistics({ ...logistics, jobId: event.target.value })} /></Field>
              <Field label="KM"><Input value={logistics.distanceKm} onChange={event => setLogistics({ ...logistics, distanceKm: event.target.value })} /></Field>
              <Field label="Viagens"><Input value={logistics.trips} onChange={event => setLogistics({ ...logistics, trips: event.target.value })} /></Field>
              <Field label="R$/KM"><Input value={logistics.costPerKm} onChange={event => setLogistics({ ...logistics, costPerKm: event.target.value })} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-5">
              {(["tolls", "parking", "meals", "lodging", "otherCosts"] as const).map(key => (
                <Field key={key} label={key}><Input value={logistics[key]} onChange={event => setLogistics({ ...logistics, [key]: event.target.value })} /></Field>
              ))}
            </div>
            <Button onClick={() => createLogistics.mutate({ ...logistics })} disabled={createLogistics.isPending}>Registrar logística</Button>
            <div className="space-y-2">
              {(logisticsRows.data || []).slice(0, 5).map(row => (
                <div key={row.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>Orçamento #{row.jobId || "—"} · {row.distanceKm || 0} km</span>
                  <strong>{currency(row.totalCost)}</strong>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FilePlus2 className="h-4 w-4" /> Versões de Orçamento</CardTitle>
            <CardDescription>Preserve histórico de escopo, exclusões e premissas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Orçamento ID"><Input value={quoteVersion.jobId} onChange={event => setQuoteVersion({ ...quoteVersion, jobId: event.target.value })} /></Field>
              <Field label="Versão"><Input value={quoteVersion.versionNumber} onChange={event => setQuoteVersion({ ...quoteVersion, versionNumber: event.target.value })} /></Field>
              <Field label="Status"><Input value={quoteVersion.status} onChange={event => setQuoteVersion({ ...quoteVersion, status: event.target.value })} /></Field>
            </div>
            <Field label="Escopo incluído"><Textarea value={quoteVersion.scopeIncluded} onChange={event => setQuoteVersion({ ...quoteVersion, scopeIncluded: event.target.value })} /></Field>
            <Button onClick={() => createQuoteVersion.mutate({ ...quoteVersion })} disabled={!quoteVersion.jobId || createQuoteVersion.isPending}>Registrar versão</Button>
            <div className="space-y-2">
              {(quoteVersions.data || []).slice(0, 5).map(row => (
                <div key={row.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>Orçamento #{row.jobId} · versão {row.versionNumber}</span>
                  <StatusBadge status={row.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" /> Aditivos e Alterações de Escopo</CardTitle>
            <CardDescription>Registre impacto financeiro, prazo e decisão.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Orçamento ID"><Input value={scopeChange.jobId} onChange={event => setScopeChange({ ...scopeChange, jobId: event.target.value })} /></Field>
              <Field label="OS ID"><Input value={scopeChange.workOrderId} onChange={event => setScopeChange({ ...scopeChange, workOrderId: event.target.value })} /></Field>
              <Field label="Impacto financeiro"><Input value={scopeChange.financialImpact} onChange={event => setScopeChange({ ...scopeChange, financialImpact: event.target.value })} /></Field>
            </div>
            <Field label="Descrição"><Textarea value={scopeChange.description} onChange={event => setScopeChange({ ...scopeChange, description: event.target.value })} /></Field>
            <Button onClick={() => createScopeChange.mutate({ ...scopeChange })} disabled={!scopeChange.jobId || !scopeChange.description || createScopeChange.isPending}>Registrar aditivo</Button>
            <div className="space-y-2">
              {(scopeChanges.data || []).slice(0, 5).map(row => (
                <div key={row.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Orçamento #{row.jobId} · {currency(row.financialImpact)}</span>
                    <StatusBadge status={row.status} />
                  </div>
                  {row.status === "pendente" && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => decideMutation.mutate({ endpoint: `/api/commercial/scope-changes/${row.id}/approve` })}>Aprovar</Button>
                      <Button size="sm" variant="outline" onClick={() => decideMutation.mutate({ endpoint: `/api/commercial/scope-changes/${row.id}/reject` })}>Rejeitar</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg bg-white/70 p-3"><p className="font-semibold">{title}</p><p className="mt-1">{text}</p></div>;
}
