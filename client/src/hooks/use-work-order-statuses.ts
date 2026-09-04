import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { WorkOrderStatus } from "@shared/schema";

export function useWorkOrderStatuses() {
  return useQuery<WorkOrderStatus[]>({
    queryKey: ["/api/work-order-statuses"],
  });
}

export function useCreateWorkOrderStatus() {
  return useMutation({
    mutationFn: (data: Partial<WorkOrderStatus>) =>
      apiRequest("POST", "/api/work-order-statuses", data).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/work-order-statuses"] }),
  });
}

export function useUpdateWorkOrderStatus() {
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<WorkOrderStatus> & { id: number }) =>
      apiRequest("PUT", `/api/work-order-statuses/${id}`, data).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/work-order-statuses"] }),
  });
}

export function useDeleteWorkOrderStatus() {
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/work-order-statuses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/work-order-statuses"] }),
  });
}
