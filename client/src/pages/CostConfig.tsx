import { useState, useEffect } from "react";
import { useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCostConfig, useUpdateCostConfig } from "@/hooks/use-cost-config";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Users, Car, TrendingDown, TrendingUp, AlertTriangle,
  DollarSign, CheckCircle, XCircle, Save, RefreshCcw, Info, Package
} from "lucide-react";
import type { CostConfig } from "@shared/schema";

const configSchema = z.object({
  laborDailyRate: z.coerce.number().min(0),
  laborHourlyRate: z.coerce.number().min(0),
  transportCostPerKm: z.coerce.number().min(0),
  transportMinimumCost: z.coerce.number().min(0),
  idealMarginPct: z.coerce.number().min(0).max(100),
  minMarginPct: z.coerce.number().min(0).max(100),
  alertMarginPct: z.coerce.number().min(0).max(100),
  prohibitedMarginPct: z.coerce.number().min(0).max(100),
  minimumServiceValue: z.coerce.number().min(0),
});

type ConfigFormData = z.infer<typeof configSchema>;

function formatBRL(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  bgClass: string;
  children: React.ReactNode;
}

function SectionCard({ icon, title, description, bgClass, children }: SectionCardProps) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className={`pb-3 ${bgClass}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/80 text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  );
}

interface FieldRowProps {
  label: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  step?: string;
  min?: string;
  max?: string;
  fieldName: keyof ConfigFormData;
  register: UseFormRegister<ConfigFormData>;
  error?: string;
  testId?: string;
}

function FieldRow({ label, hint, prefix, suffix, step, min, max, fieldName, register, error, testId }: FieldRowProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={fieldName} className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-sm text-gray-500 font-medium select-none z-10">{prefix}</span>
        )}
        <Input
          id={fieldName}
          type="number"
          step={step || "0.01"}
          min={min || "0"}
          max={max}
          className={`${prefix ? "pl-10" : ""} ${suffix ? "pr-12" : ""} ${error ? "border-red-400" : ""}`}
          data-testid={testId}
          {...register(fieldName)}
        />
        {suffix && (
          <span className="absolute right-3 text-sm text-gray-500 font-medium select-none">{suffix}</span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function MarginLegend({ idealPct, alertPct, prohibitedPct }: { idealPct: number; alertPct: number; prohibitedPct: number }) {
  const items = [
    {
      label: "ACEITAR (Ideal)",
      color: "bg-emerald-100 text-emerald-800 border border-emerald-300",
      value: `≥ ${idealPct.toFixed(0)}%`,
      icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    },
    {
      label: "ACEITAR (Aceitável)",
      color: "bg-green-100 text-green-800 border border-green-300",
      value: `${alertPct.toFixed(0)}% – ${idealPct.toFixed(0)}%`,
      icon: <CheckCircle className="w-4 h-4 text-green-600" />,
    },
    {
      label: "ALERTA",
      color: "bg-amber-100 text-amber-800 border border-amber-300",
      value: `${prohibitedPct.toFixed(0)}% – ${alertPct.toFixed(0)}%`,
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    },
    {
      label: "RECUSAR",
      color: "bg-red-100 text-red-800 border border-red-300",
      value: `< ${prohibitedPct.toFixed(0)}%`,
      icon: <XCircle className="w-4 h-4 text-red-600" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {items.map(item => (
        <div key={item.label} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${item.color}`}>
          {item.icon}
          <div>
            <div className="font-semibold">{item.label}</div>
            <div className="opacity-75">{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SimulatorPanel({ minMarginPct, prohibitedPct, minimumServiceValue }: { minMarginPct: number; prohibitedPct: number; minimumServiceValue: number }) {
  const [simCost, setSimCost] = useState(2000);
  const [simPrice, setSimPrice] = useState(3000);

  const margin = simPrice > 0 ? (simPrice - simCost) / simPrice : 0;
  const marginPct = margin * 100;
  const suggested = simCost > 0 ? simCost / (1 - minMarginPct / 100) : 0;

  let status = "ACEITAR (Ideal)";
  let statusColor = "text-emerald-600";
  let statusBg = "bg-emerald-50 border-emerald-200";

  if (simPrice < minimumServiceValue) {
    status = `RECUSAR (abaixo mínimo R$ ${minimumServiceValue.toLocaleString("pt-BR")})`;
    statusColor = "text-red-600";
    statusBg = "bg-red-50 border-red-200";
  } else if (marginPct < prohibitedPct) {
    status = "RECUSAR";
    statusColor = "text-red-600";
    statusBg = "bg-red-50 border-red-200";
  } else if (marginPct < minMarginPct) {
    status = "ALERTA";
    statusColor = "text-amber-600";
    statusBg = "bg-amber-50 border-amber-200";
  }

  return (
    <Card className="border-dashed border-2 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          <CardTitle className="text-sm text-blue-700">Simulador de Margem</CardTitle>
        </div>
        <CardDescription className="text-xs">Teste como as configurações acima impactam um serviço real</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Custo total (R$)</Label>
            <Input
              type="number"
              value={simCost}
              onChange={e => setSimCost(Number(e.target.value))}
              step="100"
              min="0"
              data-testid="simulator-cost"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Preço de venda (R$)</Label>
            <Input
              type="number"
              value={simPrice}
              onChange={e => setSimPrice(Number(e.target.value))}
              step="100"
              min="0"
              data-testid="simulator-price"
            />
          </div>
        </div>
        <div className={`mt-4 rounded-lg border p-3 ${statusBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Resultado</p>
              <p className={`text-lg font-bold ${statusColor}`}>{status}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Margem</p>
              <p className={`text-xl font-bold ${statusColor}`}>{marginPct.toFixed(1)}%</p>
            </div>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-xs text-gray-600">
            <span>Preço sugerido (mín. {minMarginPct.toFixed(0)}%)</span>
            <span className="font-semibold">{formatBRL(suggested)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CostConfig() {
  const { data: config, isLoading } = useCostConfig();
  const updateMutation = useUpdateCostConfig();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      laborDailyRate: 800,
      laborHourlyRate: 100,
      transportCostPerKm: 1.5,
      transportMinimumCost: 50,
      idealMarginPct: 40,
      minMarginPct: 30,
      alertMarginPct: 30,
      prohibitedMarginPct: 25,
      minimumServiceValue: 1000,
    },
  });

  useEffect(() => {
    if (config) {
      reset({
        laborDailyRate: config.laborDailyRate,
        laborHourlyRate: config.laborHourlyRate,
        transportCostPerKm: config.transportCostPerKm,
        transportMinimumCost: config.transportMinimumCost,
        idealMarginPct: config.idealMarginPercent * 100,
        minMarginPct: config.minMarginPercent * 100,
        alertMarginPct: config.alertMarginPercent * 100,
        prohibitedMarginPct: config.prohibitedMarginPercent * 100,
        minimumServiceValue: config.minimumServiceValue,
      });
    }
  }, [config, reset]);

  const watchedValues = watch();

  const idealPct = watchedValues.idealMarginPct ?? 40;
  const minPct = watchedValues.minMarginPct ?? 30;
  const alertPct = watchedValues.alertMarginPct ?? 30;
  const prohibitedPct = watchedValues.prohibitedMarginPct ?? 25;

  async function onSubmit(data: ConfigFormData) {
    try {
      await updateMutation.mutateAsync({
        laborDailyRate: data.laborDailyRate,
        laborHourlyRate: data.laborHourlyRate,
        transportCostPerKm: data.transportCostPerKm,
        transportMinimumCost: data.transportMinimumCost,
        idealMarginPercent: data.idealMarginPct / 100,
        minMarginPercent: data.minMarginPct / 100,
        alertMarginPercent: data.alertMarginPct / 100,
        prohibitedMarginPercent: data.prohibitedMarginPct / 100,
        minimumServiceValue: data.minimumServiceValue,
      });
      toast({
        title: "Configurações salvas",
        description: "Parâmetros de custo e margem atualizados com sucesso.",
      });
    } catch {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custos e Margens</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure os parâmetros financeiros usados no sistema de precificação inteligente
          </p>
        </div>
        <Badge variant="outline" className="hidden md:flex items-center gap-1 text-xs">
          <DollarSign className="w-3 h-3" />
          Sistema Financeiro
        </Badge>
      </div>

      {config && (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Resumo atual</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="bg-white rounded-lg p-2 border">
              <p className="text-lg font-bold text-emerald-600" data-testid="text-ideal-margin">{(config.idealMarginPercent * 100).toFixed(0)}%</p>
              <p className="text-xs text-gray-500">Margem Ideal</p>
            </div>
            <div className="bg-white rounded-lg p-2 border">
              <p className="text-lg font-bold text-blue-600">{(config.minMarginPercent * 100).toFixed(0)}%</p>
              <p className="text-xs text-gray-500">Mínimo</p>
            </div>
            <div className="bg-white rounded-lg p-2 border">
              <p className="text-lg font-bold text-amber-600">{(config.alertMarginPercent * 100).toFixed(0)}%</p>
              <p className="text-xs text-gray-500">Alerta</p>
            </div>
            <div className="bg-white rounded-lg p-2 border">
              <p className="text-lg font-bold text-red-600">{(config.prohibitedMarginPercent * 100).toFixed(0)}%</p>
              <p className="text-xs text-gray-500">Proibido</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <SectionCard
          icon={<Users className="w-5 h-5" />}
          title="Mão de Obra"
          description="Custos com equipe por dia e por hora trabalhada"
          bgClass="bg-blue-50/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow
              label="Custo por dia de equipe"
              hint="Valor total da equipe para um dia de trabalho"
              prefix="R$"
              fieldName="laborDailyRate"
              register={register}
              error={errors.laborDailyRate?.message}
              testId="input-labor-daily-rate"
            />
            <FieldRow
              label="Custo por hora"
              hint="Valor por hora trabalhada (para cálculos parciais)"
              prefix="R$"
              fieldName="laborHourlyRate"
              register={register}
              error={errors.laborHourlyRate?.message}
              testId="input-labor-hourly-rate"
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={<Car className="w-5 h-5" />}
          title="Transporte"
          description="Custos de deslocamento até o local do serviço"
          bgClass="bg-orange-50/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow
              label="Custo por km"
              hint="Combustível + desgaste veicular por quilômetro"
              prefix="R$"
              step="0.01"
              fieldName="transportCostPerKm"
              register={register}
              error={errors.transportCostPerKm?.message}
              testId="input-transport-per-km"
            />
            <FieldRow
              label="Custo mínimo de transporte"
              hint="Cobrança mínima mesmo para distâncias curtas"
              prefix="R$"
              fieldName="transportMinimumCost"
              register={register}
              error={errors.transportMinimumCost?.message}
              testId="input-transport-minimum"
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={<Package className="w-5 h-5" />}
          title="Materiais"
          description="Os custos de material são definidos individualmente em cada serviço do catálogo"
          bgClass="bg-amber-50/50"
        >
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm space-y-2">
            <p className="font-semibold text-amber-800">Integrado ao Catálogo de Serviços</p>
            <p className="text-amber-700">
              Cada serviço cadastrado no <strong>Catálogo</strong> possui campos individuais de custo:
            </p>
            <ul className="list-disc list-inside space-y-1 text-amber-700 text-xs">
              <li><strong>materialConsumptionPerM²</strong> — consumo de material por metro quadrado</li>
              <li><strong>laborCostPerM²</strong> — custo de mão de obra por metro quadrado</li>
              <li><strong>transportCostPerM²</strong> — custo de transporte por metro quadrado</li>
              <li><strong>defaultMargin</strong> — margem padrão do serviço</li>
            </ul>
            <p className="text-amber-700 text-xs mt-2">
              Esses valores são combinados com os parâmetros globais acima (transporte por km, mínimo de transporte) para calcular o custo real do serviço nos orçamentos.
            </p>
          </div>
          <div className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Para editar os custos de materiais, acesse o módulo <strong>Catálogo de Vendas</strong> na barra lateral.
          </div>
        </SectionCard>

        <SectionCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="Metas de Margem"
          description="Percentuais-alvo que guiam a precificação dos serviços"
          bgClass="bg-emerald-50/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow
              label="Margem ideal (%)"
              hint="Meta de lucro que a empresa deseja alcançar"
              suffix="%"
              step="1"
              min="0"
              max="100"
              fieldName="idealMarginPct"
              register={register}
              error={errors.idealMarginPct?.message}
              testId="input-ideal-margin"
            />
            <FieldRow
              label="Margem mínima aceitável (%)"
              hint="Abaixo disso, requer aprovação manual da gestão"
              suffix="%"
              step="1"
              min="0"
              max="100"
              fieldName="minMarginPct"
              register={register}
              error={errors.minMarginPct?.message}
              testId="input-min-margin"
            />
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 text-xs text-gray-600">
            <p className="font-semibold mb-1">Fórmula de precificação:</p>
            <code className="block bg-gray-100 rounded px-2 py-1 font-mono">
              Preço sugerido = Custo total ÷ (1 − Margem mínima %)
            </code>
          </div>
        </SectionCard>

        <SectionCard
          icon={<TrendingDown className="w-5 h-5" />}
          title="Limites de Alerta e Recusa"
          description="Abaixo desses limites, o sistema emite alertas ou bloqueia automaticamente"
          bgClass="bg-red-50/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow
              label="Margem de alerta (%)"
              hint="Abaixo disso, acende sinal amarelo para aprovação"
              suffix="%"
              step="1"
              min="0"
              max="100"
              fieldName="alertMarginPct"
              register={register}
              error={errors.alertMarginPct?.message}
              testId="input-alert-margin"
            />
            <FieldRow
              label="Margem proibida (%)"
              hint="Abaixo disso, desconto é bloqueado automaticamente"
              suffix="%"
              step="1"
              min="0"
              max="100"
              fieldName="prohibitedMarginPct"
              register={register}
              error={errors.prohibitedMarginPct?.message}
              testId="input-prohibited-margin"
            />
          </div>
          <MarginLegend
            idealPct={idealPct}
            alertPct={alertPct}
            prohibitedPct={prohibitedPct}
          />
        </SectionCard>

        <SectionCard
          icon={<DollarSign className="w-5 h-5" />}
          title="Valor Mínimo de Atendimento"
          description="Serviços abaixo deste valor são automaticamente recusados"
          bgClass="bg-purple-50/50"
        >
          <div className="max-w-sm">
            <FieldRow
              label="Valor mínimo por serviço (R$)"
              hint="A empresa não atende pedidos abaixo deste valor"
              prefix="R$"
              fieldName="minimumServiceValue"
              register={register}
              error={errors.minimumServiceValue?.message}
              testId="input-minimum-service-value"
            />
          </div>
        </SectionCard>

        <SimulatorPanel
          minMarginPct={minPct}
          prohibitedPct={prohibitedPct}
          minimumServiceValue={watchedValues.minimumServiceValue ?? 1000}
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (config) {
                reset({
                  laborDailyRate: config.laborDailyRate,
                  laborHourlyRate: config.laborHourlyRate,
                  transportCostPerKm: config.transportCostPerKm,
                  transportMinimumCost: config.transportMinimumCost,
                  idealMarginPct: config.idealMarginPercent * 100,
                  minMarginPct: config.minMarginPercent * 100,
                  alertMarginPct: config.alertMarginPercent * 100,
                  prohibitedMarginPct: config.prohibitedMarginPercent * 100,
                  minimumServiceValue: config.minimumServiceValue,
                });
              }
            }}
            disabled={!isDirty}
            data-testid="button-reset-config"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Descartar
          </Button>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            data-testid="button-save-config"
          >
            {updateMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
