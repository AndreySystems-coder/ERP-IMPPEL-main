import type { PriorityRules } from "./schema";

export interface JobScoringInput {
  serviceType: string;
  squareMeters: number;
  distanceKm: number;
  estimatedReturnLevel: "Alto" | "Médio" | "Baixo";
}

export interface ScoringResult {
  totalScore: number;
  priority: "ALTA" | "MÉDIA" | "BAIXA";
  breakdown: {
    serviceTypeScore: number;
    sizeScore: number;
    distanceScore: number;
    returnScore: number;
  };
  factors: {
    isSmall: boolean;
    isFar: boolean;
    isLowReturn: boolean;
  };
  recommendation: "ACEITAR" | "ORGANIZAR" | "RECUSAR";
  reason: string;
}

export function calculateScore(input: JobScoringInput, rules: PriorityRules): ScoringResult {
  // Service Type Score
  let serviceTypeScore = 0;
  const serviceTypeLower = input.serviceType.toLowerCase();
  
  if (serviceTypeLower.includes("asfáltica") || serviceTypeLower.includes("asfaltica")) {
    serviceTypeScore = rules.mantaAsfálticaScore;
  } else if (serviceTypeLower.includes("piscina") || serviceTypeLower.includes("prainha") || serviceTypeLower.includes("hidro")) {
    serviceTypeScore = rules.piscinaScore;
  } else if (serviceTypeLower.includes("reparo") || serviceTypeLower.includes("líquida")) {
    serviceTypeScore = rules.reparoScore;
  } else {
    serviceTypeScore = rules.reparoScore; // Default
  }

  // Size Score
  let sizeScore = 0;
  let isSmall = false;
  if (input.squareMeters >= rules.sizeGrandeThreshold) {
    sizeScore = rules.sizeGrandeScore;
  } else if (input.squareMeters >= rules.sizeMédioMin && input.squareMeters <= rules.sizeMédioMax) {
    sizeScore = rules.sizeMédioScore;
  } else {
    sizeScore = rules.sizePequenoScore;
    isSmall = true;
  }

  // Distance Score
  let distanceScore = 0;
  let isFar = false;
  if (input.distanceKm <= rules.distancePróximoThreshold) {
    distanceScore = rules.distancePróximoScore;
  } else if (input.distanceKm >= rules.distanceMédioMin && input.distanceKm <= rules.distanceMédioMax) {
    distanceScore = rules.distanceMédioScore;
  } else {
    distanceScore = rules.distanceLongeScore;
    isFar = true;
  }

  // Return Score
  let returnScore = 0;
  let isLowReturn = false;
  if (input.estimatedReturnLevel === "Alto") {
    returnScore = rules.returnAltoScore;
  } else if (input.estimatedReturnLevel === "Médio") {
    returnScore = rules.returnMédioScore;
  } else {
    returnScore = rules.returnBaixoScore;
    isLowReturn = true;
  }

  const totalScore = serviceTypeScore + sizeScore + distanceScore + returnScore;
  
  // Determine priority
  let priority: "ALTA" | "MÉDIA" | "BAIXA";
  if (totalScore >= rules.priorityAltaThreshold) {
    priority = "ALTA";
  } else if (totalScore >= rules.priorityMédiaMin) {
    priority = "MÉDIA";
  } else {
    priority = "BAIXA";
  }

  // Count bad factors
  const badFactorsCount = (isSmall ? 1 : 0) + (isFar ? 1 : 0) + (isLowReturn ? 1 : 0);

  // Determine recommendation
  let recommendation: "ACEITAR" | "ORGANIZAR" | "RECUSAR";
  let reason: string;

  // Auto-reject logic
  if (totalScore <= rules.autoRejectThreshold && badFactorsCount >= rules.badFactorCountThreshold) {
    recommendation = "RECUSAR";
    reason = `Pontuação baixa (${totalScore}) com ${badFactorsCount} fatores desfavoráveis (pequeno/longe/baixo retorno)`;
  } else if (priority === "ALTA") {
    recommendation = "ACEITAR";
    reason = `Prioridade Alta. Serviço de ${serviceTypeLower.includes("asfáltica") || serviceTypeLower.includes("asfaltica") ? "manta asfáltica" : "alta prioridade"} deve ser agendado.`;
  } else if (priority === "MÉDIA") {
    recommendation = "ORGANIZAR";
    reason = `Prioridade Média. Recomenda-se incluir na agenda e reorganizar conforme necessário.`;
  } else {
    recommendation = "RECUSAR";
    reason = `Prioridade Baixa. Considere recusar a menos que tenha capacidade ociosa.`;
  }

  return {
    totalScore,
    priority,
    breakdown: {
      serviceTypeScore,
      sizeScore,
      distanceScore,
      returnScore,
    },
    factors: {
      isSmall,
      isFar,
      isLowReturn,
    },
    recommendation,
    reason,
  };
}

export function getDefaultRules(): Partial<PriorityRules> {
  return {
    mantaAsfálticaScore: 5,
    piscinaScore: 3,
    reparoScore: 2,
    sizeGrandeThreshold: 20,
    sizeGrandeScore: 4,
    sizeMédioMin: 10,
    sizeMédioMax: 20,
    sizeMédioScore: 2,
    sizePequenoScore: 1,
    distancePróximoThreshold: 10,
    distancePróximoScore: 3,
    distanceMédioMin: 10,
    distanceMédioMax: 25,
    distanceMédioScore: 2,
    distanceLongeScore: 0,
    returnAltoScore: 4,
    returnMédioScore: 2,
    returnBaixoScore: 0,
    priorityAltaThreshold: 12,
    priorityMédiaMin: 8,
    priorityBaixaMax: 7,
    autoRejectThreshold: 7,
    badFactorCountThreshold: 2,
  };
}
