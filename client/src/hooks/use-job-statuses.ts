import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { JobStatus } from "@shared/schema";

export function useJobStatuses() {
  return useQuery<JobStatus[]>({
    queryKey: ["/api/job-statuses"],
  });
}

export function useCreateJobStatus() {
  return useMutation({
    mutationFn: (data: Partial<JobStatus>) =>
      apiRequest("POST", "/api/job-statuses", data).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/job-statuses"] }),
  });
}

export function useUpdateJobStatus() {
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<JobStatus> & { id: number }) =>
      apiRequest("PUT", `/api/job-statuses/${id}`, data).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/job-statuses"] }),
  });
}

export function useDeleteJobStatus() {
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/job-statuses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/job-statuses"] }),
  });
}
