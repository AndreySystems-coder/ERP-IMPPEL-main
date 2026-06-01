import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useDashboardMetrics() {
  return useQuery({
    queryKey: [api.dashboard.metrics.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.metrics.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return api.dashboard.metrics.responses[200].parse(await res.json());
    },
  });
}
