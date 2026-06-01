import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Client, InsertClient } from "@shared/schema";

export function useClients() {
  return useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await fetch(api.clients.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json() as Promise<Client[]>;
    },
  });
}

export function useCreateClient() {
  return useMutation({
    mutationFn: async (client: InsertClient) => {
      const res = await apiRequest("POST", api.clients.create.path, client);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Erro ao criar cliente");
      }
      return res.json() as Promise<Client>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });
}

export function useUpdateClient() {
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InsertClient> & { id: number }) => {
      const res = await apiRequest("PUT", buildUrl(api.clients.update.path, { id }), updates);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Erro ao atualizar cliente");
      }
      return res.json() as Promise<Client>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });
}

export function useDeleteClient() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", buildUrl(api.clients.delete.path, { id }));
      if (!res.ok) throw new Error("Erro ao deletar cliente");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });
}
