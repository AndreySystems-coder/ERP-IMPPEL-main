import type { CostConfig } from "./schema";

export interface CostCalculationInput {
  squareMeters: number;
  distanceKm: number;
  serviceLaborCostPerM2?: number;
  serviceMaterialCostPerM2?: number;
  serviceTransportCostPerM2?: number;
}

export interface CostCalculation {
  materialCost: number;
  laborCost: number;
  transportCost: number;
  extrasCost: number;
  totalCost: number;
  suggestedPrice: number;
}

export type MarginStatus = "ACEITAR" | "ALERTA" | "RECUSAR";
export type MarginLevel = "IDEAL" | "ACEITÁVEL" | "CRÍTICA" | "PROIBIDA";

export interface MarginEvaluation {
  status: MarginStatus;
  level: MarginLevel;
  marginPercent: number;
  reason: string;
  color: "green" | "yellow" | "red";
}

export interface DiscountValidation {
  isValid: boolean;
  isBlocked: boolean;
  newPrice: number;
  newMargin: number;
  reason: string;
}

export interface CombinedRecommendation {
  recommendation: string;
  reason: string;
  color: "green" | "yellow" | "blue" | "red";
  priority: "ALTA" | "MÉDIA" | "BAIXA";
}

export function calculateTotalCost(
  input: CostCalculationInput,
  config: CostConfig,
): CostCalculation {
  const { squareMeters, distanceKm, serviceLaborCostPerM2 = 0, serviceMaterialCostPerM2 = 0, serviceTransportCostPerM2 = 0 } = input;

  const materialCost = squareMeters * serviceMaterialCostPerM2;

  // Labor: use global rate (hourly * estimated hours, min 1 day) vs. service catalog rate
  const estimatedLaborHours = squareMeters * 0.25; // ~4 m²/hour productivity estimate
  const laborFromGlobalRate = config.laborHourlyRate * estimatedLaborHours;
  const laborFromServiceCatalog = squareMeters * serviceLaborCostPerM2;
  // Take the greater of the two and enforce a minimum of one full day's labor cost
  const laborCost = Math.max(laborFromGlobalRate, laborFromServiceCatalog, config.laborDailyRate);

  const transportFromKm = distanceKm * config.transportCostPerKm;
  const transportFromService = squareMeters * serviceTransportCostPerM2;
  const transportCost = Math.max(transportFromKm, transportFromService, config.transportMinimumCost);

  const extrasCost = 0;

  const totalCost = materialCost + laborCost + transportCost + extrasCost;
  const suggestedPrice = totalCost > 0 ? totalCost / (1 - config.minMarginPercent) : 0;

  return { materialCost, laborCost, transportCost, extrasCost, totalCost, suggestedPrice };
}

export function calculateSuggestedPrice(totalCost: number, minMarginPercent: number): number {
  if (totalCost <= 0 || minMarginPercent >= 1) return 0;
  return totalCost / (1 - minMarginPercent);
}

export function evaluateMargin(price: number, totalCost: number, config: CostConfig): MarginEvaluation {
  if (price <= 0) {
    return {
      status: "ALERTA",
      level: "CRÍTICA",
      marginPercent: 0,
      reason: "Informe o preço vendido para calcular a margem",
      color: "yellow",
    };
  }

  if (price < config.minimumServiceValue) {
    return {
      status: "RECUSAR",
      level: "PROIBIDA",
      marginPercent: totalCost > 0 ? (price - totalCost) / price : 0,
      reason: `Valor R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} abaixo do mínimo de atendimento (R$ ${config.minimumServiceValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`,
      color: "red",
    };
  }

  if (totalCost <= 0) {
    return {
      status: "ALERTA",
      level: "CRÍTICA",
      marginPercent: 0,
      reason: "Custo não calculado. Selecione um serviço e informe m².",
      color: "yellow",
    };
  }

  const marginPercent = (price - totalCost) / price;
  const marginPct = (marginPercent * 100).toFixed(1);
  const idealPct = (config.idealMarginPercent * 100).toFixed(0);
  const minPct = (config.minMarginPercent * 100).toFixed(0);
  const prohibitedPct = (config.prohibitedMarginPercent * 100).toFixed(0);

  const alertPct = (config.alertMarginPercent * 100).toFixed(0);

  if (marginPercent >= config.idealMarginPercent) {
    return {
      status: "ACEITAR",
      level: "IDEAL",
      marginPercent,
      reason: `Margem de ${marginPct}% acima do ideal (${idealPct}%). Serviço altamente recomendado.`,
      color: "green",
    };
  } else if (marginPercent >= config.alertMarginPercent) {
    return {
      status: "ACEITAR",
      level: "ACEITÁVEL",
      marginPercent,
      reason: `Margem de ${marginPct}% dentro da faixa aceitável (${alertPct}%–${idealPct}%). Serviço aprovado.`,
      color: "green",
    };
  } else if (marginPercent >= config.prohibitedMarginPercent) {
    return {
      status: "ALERTA",
      level: "CRÍTICA",
      marginPercent,
      reason: `Margem de ${marginPct}% abaixo do alerta (${alertPct}%). Requer aprovação manual da gestão.`,
      color: "yellow",
    };
  } else {
    return {
      status: "RECUSAR",
      level: "PROIBIDA",
      marginPercent,
      reason: `Margem de ${marginPct}% abaixo do limite proibido (${prohibitedPct}%). Recusar automaticamente.`,
      color: "red",
    };
  }
}

export function validateDiscount(
  originalPrice: number,
  discountPercent: number,
  totalCost: number,
  config: CostConfig,
): DiscountValidation {
  const newPrice = originalPrice * (1 - discountPercent / 100);
  const newMargin = newPrice > 0 ? (newPrice - totalCost) / newPrice : 0;

  if (newMargin < config.prohibitedMarginPercent) {
    return {
      isValid: false,
      isBlocked: true,
      newPrice,
      newMargin,
      reason: `Desconto de ${discountPercent}% causa margem de ${(newMargin * 100).toFixed(1)}%, abaixo do limite proibido de ${(config.prohibitedMarginPercent * 100).toFixed(0)}%. Desconto bloqueado.`,
    };
  } else if (newMargin < config.minMarginPercent) {
    return {
      isValid: true,
      isBlocked: false,
      newPrice,
      newMargin,
      reason: `Desconto de ${discountPercent}% leva a margem ${(newMargin * 100).toFixed(1)}% (abaixo do mínimo de ${(config.minMarginPercent * 100).toFixed(0)}%). Requer aprovação manual.`,
    };
  }

  return {
    isValid: true,
    isBlocked: false,
    newPrice,
    newMargin,
    reason: `Desconto de ${discountPercent}% aplicado. Margem resultante: ${(newMargin * 100).toFixed(1)}%`,
  };
}

export function getCombinedRecommendation(
  priorityRecommendation: "ACEITAR" | "ORGANIZAR" | "RECUSAR",
  marginStatus: MarginStatus,
  priority: "ALTA" | "MÉDIA" | "BAIXA",
): CombinedRecommendation {
  if (marginStatus === "RECUSAR") {
    return {
      recommendation: "RECUSAR",
      reason: "Margem insuficiente para este serviço.",
      color: "red",
      priority,
    };
  }

  if (priorityRecommendation === "ACEITAR" && marginStatus === "ACEITAR") {
    return {
      recommendation: "EXECUTAR PRIMEIRO",
      reason: "Alta prioridade + boa margem. Prioridade máxima na agenda.",
      color: "green",
      priority,
    };
  }

  if (priority === "ALTA" && marginStatus === "ALERTA") {
    return {
      recommendation: "APROVAR COM ATENÇÃO",
      reason: "Alta prioridade mas margem abaixo do ideal. Negociar preço antes de aceitar.",
      color: "yellow",
      priority,
    };
  }

  if (marginStatus === "ACEITAR" && priority === "BAIXA") {
    return {
      recommendation: "ORGANIZAR",
      reason: "Boa margem mas baixa prioridade. Agendar quando houver disponibilidade.",
      color: "blue",
      priority,
    };
  }

  if (priorityRecommendation === "RECUSAR") {
    return {
      recommendation: "RECUSAR",
      reason: "Baixa prioridade operacional. Considere recusar.",
      color: "red",
      priority,
    };
  }

  return {
    recommendation: "ORGANIZAR",
    reason: "Prioridade média. Incluir na agenda conforme disponibilidade.",
    color: "blue",
    priority,
  };
}

export function getDefaultCostConfig(): Omit<CostConfig, "id" | "createdAt" | "updatedAt"> {
  return {
    laborDailyRate: 800,
    laborHourlyRate: 100,
    transportCostPerKm: 1.5,
    transportMinimumCost: 50,
    minMarginPercent: 0.30,
    idealMarginPercent: 0.40,
    alertMarginPercent: 0.30,
    prohibitedMarginPercent: 0.25,
    minimumServiceValue: 1000,
  };
}
