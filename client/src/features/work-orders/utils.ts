import type { ServiceProgress, WorkOrderMaterial } from "@/features/work-orders/types";

export function getDisplayUnit(material: WorkOrderMaterial): string {
  return material.inventoryUnit || (material.unit === "per_m2" ? "un" : "un");
}

export function parseMaterialsNeeded(materialsNeeded?: string | null): WorkOrderMaterial[] {
  if (!materialsNeeded) return [];

  try {
    const parsed = JSON.parse(materialsNeeded);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ceilQty(n: number): number {
  if (!n || n <= 0) return 0;
  return Math.ceil(n);
}

export function getExceededMaterials(sp: ServiceProgress): { name: string; planned: number; real: number }[] {
  return sp.realMaterials
    .filter(material => material.realQty > material.plannedQty && material.plannedQty > 0)
    .map(material => ({ name: material.name, planned: material.plannedQty, real: material.realQty }));
}

export function buildProgressFromJob(wo: any, job: any | null): ServiceProgress[] {
  const materials: WorkOrderMaterial[] = parseMaterialsNeeded(wo.materialsNeeded);

  const serviceItems: any[] = [];
  try {
    if (job?.serviceItems) serviceItems.push(...JSON.parse(job.serviceItems));
  } catch {}

  if (serviceItems.length === 0) {
    return [{
      serviceName: wo.serviceType || "Serviço principal",
      started: false,
      startDate: "",
      endDate: "",
      finished: false,
      realMaterials: materials.map(material => ({
        name: material.name,
        inventoryId: material.inventoryId,
        plannedQty: ceilQty(material.quantity),
        realQty: 0,
      })),
      observations: "",
    }];
  }

  const totalArea = serviceItems.reduce((sum: number, service: any) => sum + (Number(service.area) || 0), 0);

  return serviceItems.map((service: any) => {
    const ratio = totalArea > 0 ? (Number(service.area) || 0) / totalArea : 1 / serviceItems.length;
    const label = [service.lugar, service.name].filter(Boolean).join(": ");

    return {
      serviceName: label || "Serviço",
      started: false,
      startDate: "",
      endDate: "",
      finished: false,
      realMaterials: materials.map(material => ({
        name: material.name,
        inventoryId: material.inventoryId,
        plannedQty: ceilQty(material.quantity * ratio),
        realQty: 0,
      })),
      observations: "",
    };
  });
}
