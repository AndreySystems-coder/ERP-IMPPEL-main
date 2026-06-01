import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PriorityRules } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function usePriorityRules() {
  return useQuery<PriorityRules>({
    queryKey: ["/api/priority-rules"],
  });
}

export function useUpdatePriorityRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rules: Partial<PriorityRules>) =>
      apiRequest("PATCH", "/api/priority-rules", rules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/priority-rules"] });
    },
  });
}
