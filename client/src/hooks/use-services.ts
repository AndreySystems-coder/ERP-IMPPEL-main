import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Service, InsertService } from "@shared/schema";

export function useServices() {
  return useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch(api.services.list.path, { credentials: "include" });
      return res.json() as Promise<Service[]>;
    },
  });
}

export function useCreateService() {
  return useMutation({
    mutationFn: async (service: InsertService) => {
      return apiRequest("POST", api.services.create.path, service);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
  });
}

export function useUpdateService() {
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InsertService> & { id: number }) => {
      return apiRequest("PUT", buildUrl(api.services.update.path, { id }), updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
  });
}

export function useDeleteService() {
  return useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", buildUrl(api.services.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
  });
}
