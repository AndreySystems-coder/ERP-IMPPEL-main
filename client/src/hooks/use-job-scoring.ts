import { useMemo } from "react";
import { usePriorityRules } from "./use-priority-rules";
import { calculateScore } from "@shared/scoringEngine";
import type { Job } from "@shared/schema";

export interface JobWithScore extends Job {
  score: number;
  priority: "ALTA" | "MÉDIA" | "BAIXA";
  recommendation: "ACEITAR" | "ORGANIZAR" | "RECUSAR";
  reason: string;
}

export function useJobScoring(jobs: Job[] = []) {
  const { data: rules } = usePriorityRules();

  const jobsWithScores = useMemo(() => {
    if (!rules || !jobs.length) return [];

    return jobs.map(job => {
      const result = calculateScore({
        serviceType: job.serviceType,
        squareMeters: job.squareMeters || 0,
        distanceKm: 0, // We can add distance field later
        estimatedReturnLevel: job.profit && job.realPriceSold ? 
          (job.profit / job.realPriceSold > 0.3 ? "Alto" : job.profit / job.realPriceSold > 0.15 ? "Médio" : "Baixo")
          : "Médio",
      }, rules);

      return {
        ...job,
        score: result.totalScore,
        priority: result.priority,
        recommendation: result.recommendation,
        reason: result.reason,
      } as JobWithScore;
    });
  }, [jobs, rules]);

  const highPriority = jobsWithScores.filter(j => j.priority === "ALTA");
  const mediumPriority = jobsWithScores.filter(j => j.priority === "MÉDIA");
  const lowPriority = jobsWithScores.filter(j => j.priority === "BAIXA");

  return {
    jobsWithScores,
    highPriority,
    mediumPriority,
    lowPriority,
    stats: {
      total: jobsWithScores.length,
      alta: highPriority.length,
      média: mediumPriority.length,
      baixa: lowPriority.length,
    },
  };
}
