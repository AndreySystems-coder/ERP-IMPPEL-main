import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CostConfig, InsertCostConfig } from "@shared/schema";

export function useCostConfig() {
  return useQuery<CostConfig>({
    queryKey: ["/api/cost-config"],
  });
}

export function useUpdateCostConfig() {
  return useMutation({
    mutationFn: async (data: Partial<InsertCostConfig>) => {
      const res = await apiRequest("PATCH", "/api/cost-config", data);
      return res.json() as Promise<CostConfig>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cost-config"] });
    },
  });
}
