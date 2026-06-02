import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { Calendar, MessageCircle, Phone, Plus } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";
import { WorkOrderDetailModal } from "@/features/work-orders/components/WorkOrderDetailModal";
import { generateWorkOrderReportPdf } from "@/features/work-orders/workOrderReportPdf";
import { WorkOrderForm } from "@/features/work-orders/components/WorkOrderForm";
import { WorkOrderList } from "@/features/work-orders/components/WorkOrderList";
import { CHECKLIST_ITEMS, STATUS_COLORS } from "@/features/work-orders/constants";
import type { ServiceProgress, WorkOrderMaterialReconciliationResponse } from "@/features/work-orders/types";
import { buildProgressFromJob, ceilQty, getExceededMaterials } from "@/features/work-orders/utils";

const apiRequest = async (method: string, path: string, body?: any) => {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(res.statusText);
  if (res.status === 204) return null;
  return res.json();
};

export default function WorkOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: currentUser } = useUser();

  const { data: workOrders = [], isLoading: isLoadingWorkOrders } = useQuery({
    queryKey: ["/api/work-orders"],
    queryFn: () => apiRequest("GET", "/api/work-orders"),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["/api/jobs"],
    queryFn: () => apiRequest("GET", "/api/jobs"),
  });

  const createWO = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/work-orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({ title: "OS criada!" });
    },
    onError: () => toast({ title: "Erro ao criar OS", variant: "destructive" }),
  });
  const updateWO = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PUT", `/api/work-orders/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] }); toast({ title: "OS atualizada!" }); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });
  const deleteWO = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/work-orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({ title: "OS removida!" });
    },
    onError: () => toast({ title: "Erro ao remover OS", variant: "destructive" }),
  });

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<"info" | "obra">("info");
  const [detailWO, setDetailWO] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingWO, setEditingWO] = useState<any>(null);

  // WhatsApp send modal
  const [waWO, setWaWO] = useState<{ open: boolean; wo: any }>({ open: false, wo: null });
  const [waPhone, setWaPhone] = useState("");
  const [waMessage, setWaMessage] = useState("");

  const openWAModal = (wo: any) => {
    const defaultMsg = `OlÃ¡! ðŸ‘‹ Aqui Ã© da IMPPEL ImpermeabilizaÃ§Ã£o.\n\nInformamos que sua Ordem de ServiÃ§o *OS #${wo.id}* â€” *${wo.serviceType}* estÃ¡ em andamento.\n\nEquipe IMPPEL ðŸ—ï¸`;
    setWaPhone("");
    setWaMessage(defaultMsg);
    setWaWO({ open: true, wo });
  };

  const handleWASend = () => {
    const digits = waPhone.replace(/\D/g, "");
    const intl = digits.startsWith("55") ? digits : `55${digits}`;
    const url = `https://wa.me/${intl}?text=${encodeURIComponent(waMessage)}`;
    fetch("/api/whatsapp/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: digits, message: waMessage, flowName: `OS #${waWO.wo?.id} â€” AtualizaÃ§Ã£o` }),
    }).catch(() => {});
    window.open(url, "_blank");
    setWaWO({ open: false, wo: null });
  };

  // â”€â”€ Create/Edit form fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [teamAssigned, setTeamAssigned] = useState("");
  const [status, setStatus] = useState("Planejada");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<Array<{ category: string; data: string; timestamp: string }>>([]);

  // â”€â”€ Registro de Obra state (in detail view) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [serviceProgress, setServiceProgress] = useState<ServiceProgress[]>([]);
  const [obraObservations, setObraObservations] = useState("");
  const [savingObra, setSavingObra] = useState(false);

  // â”€â”€ Consumption log state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [selectedConsumoSvcIdx, setSelectedConsumoSvcIdx] = useState(0);
  const [consumoInputs, setConsumoInputs] = useState<Record<number, string>>({});
  const [consumoNotes, setConsumoNotes] = useState("");
  const [savingConsumo, setSavingConsumo] = useState(false);

  // â”€â”€ Checklist tÃ©cnico + finalizaÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [checklistDone, setChecklistDone] = useState<Record<string, boolean>>({});
  const [finalizando, setFinalizando] = useState(false);
  const [warrantyCreated, setWarrantyCreated] = useState<any>(null);
  const [postSaleCreated, setPostSaleCreated] = useState<any>(null);
  const [ignorePendingMaterials, setIgnorePendingMaterials] = useState(false);

  const filteredWO = workOrders.filter(
    (w: any) =>
      w.clientName.toLowerCase().includes(search.toLowerCase()) ||
      w.serviceType.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditingWO(null);
    setClientName(""); setAddress(""); setServiceType("");
    setScheduledDate(""); setTeamAssigned(""); setStatus("Planejada");
    setNotes(""); setPhotos([]);
    setIsModalOpen(true);
  };

  const openEdit = (wo: any) => {
    setEditingWO(wo);
    setClientName(wo.clientName); setAddress(wo.address || ""); setServiceType(wo.serviceType);
    setScheduledDate(wo.scheduledDate ? wo.scheduledDate.split("T")[0] : "");
    setTeamAssigned(wo.teamAssigned || ""); setStatus(wo.status); setNotes(wo.notes || "");
    setPhotos(wo.photos ? JSON.parse(wo.photos) : []);
    setIsModalOpen(true);
  };

  // Generic service name patterns (old/placeholder names that mean "no real data yet")
  const GENERIC_NAMES = new Set(["ServiÃ§o principal", "ServiÃ§o", "Multi-serviÃ§os", "Novo ServiÃ§o"]);
  const isGenericProgress = (progress: ServiceProgress[]) =>
    progress.every(sp => GENERIC_NAMES.has(sp.serviceName));

  const openDetail = (wo: any) => {
    setDetailWO(wo);
    setActiveDetailTab("obra");
    setObraObservations(wo.obraObservations || "");
    setSelectedConsumoSvcIdx(0);
    setConsumoInputs({});
    setConsumoNotes("");
    setWarrantyCreated(null);
    setPostSaleCreated(null);
    // Load saved checklist state
    try {
      setChecklistDone(wo.checklistDone ? JSON.parse(wo.checklistDone) : {});
    } catch {
      setChecklistDone({});
    }

    const relatedJob = jobs.find((j: any) => j.id === wo.jobId) || null;

    // Check for saved progress
    if (wo.serviceProgress) {
      try {
        const parsed: ServiceProgress[] = JSON.parse(wo.serviceProgress);

        // If saved data has only generic placeholder names AND the job has real service items,
        // re-initialize from the job to get the correct per-service breakdown
        let hasRealJobServices = false;
        try {
          const jobSvcs = relatedJob?.serviceItems ? JSON.parse(relatedJob.serviceItems) : [];
          hasRealJobServices = jobSvcs.length > 0;
        } catch {}

        if (!isGenericProgress(parsed) || !hasRealJobServices) {
          // Use saved progress â€” apply ceiling to quantities
          const ceiled = parsed.map(sp => ({
            ...sp,
            realMaterials: sp.realMaterials.map(m => ({
              ...m,
              plannedQty: ceilQty(m.plannedQty),
              realQty: m.realQty > 0 ? ceilQty(m.realQty) : 0,
            })),
          }));
          setServiceProgress(ceiled);
          setIsDetailOpen(true);
          return;
        }
        // Fall through to re-init from job (old generic data detected)
      } catch {}
    }

    // Initialize from job serviceItems (one entry per service, materials proportional by area)
    setServiceProgress(buildProgressFromJob(wo, relatedJob));
    setIsDetailOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      setPhotos(prev => [...prev, { category, data, timestamp: new Date().toISOString() }]);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index: number) => setPhotos(photos.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      clientName, address, serviceType,
      scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : null,
      teamAssigned, status,
      photos: photos.length > 0 ? JSON.stringify(photos) : null,
      notes,
    };
    if (editingWO) await updateWO.mutateAsync({ id: editingWO.id, ...payload });
    else await createWO.mutateAsync(payload);
    setIsModalOpen(false);
  };

  // â”€â”€ Update service progress field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const updateSP = (idx: number, field: keyof ServiceProgress, value: any) => {
    setServiceProgress(prev => prev.map((sp, i) => i === idx ? { ...sp, [field]: value } : sp));
  };

  const updateRealMat = (spIdx: number, matIdx: number, rawValue: number) => {
    // Always ceiling the real quantity â€” we deal with whole packages
    const ceiledQty = rawValue > 0 ? Math.ceil(rawValue) : 0;
    setServiceProgress(prev => prev.map((sp, i) => {
      if (i !== spIdx) return sp;
      const newMats = sp.realMaterials.map((m, j) => j === matIdx ? { ...m, realQty: ceiledQty } : m);
      return { ...sp, realMaterials: newMats };
    }));
    // Warn if exceeded planned
    const sp = serviceProgress[spIdx];
    if (!sp) return;
    const mat = sp.realMaterials[matIdx];
    if (!mat) return;
    if (ceiledQty > mat.plannedQty && mat.plannedQty > 0) {
      toast({
        title: "âš ï¸ Material excedido!",
        description: `${mat.name}: planejado ${mat.plannedQty} un., utilizado ${ceiledQty} un. (+${ceiledQty - mat.plannedQty})`,
        variant: "destructive",
      });
    }
  };

  const addServiceToProgress = () => {
    setServiceProgress(prev => [...prev, {
      serviceName: "Novo ServiÃ§o", started: false, startDate: "", endDate: "", finished: false,
      realMaterials: [], observations: "",
    }]);
  };

  const saveObraProgress = async () => {
    if (!detailWO) return;
    setSavingObra(true);
    try {
      const updatedStatus = serviceProgress.every(sp => sp.finished) ? "ConcluÃ­da" : serviceProgress.some(sp => sp.started) ? "Em Andamento" : detailWO.status;
      await updateWO.mutateAsync({
        id: detailWO.id,
        serviceProgress: JSON.stringify(serviceProgress),
        obraObservations,
        checklistDone: JSON.stringify(checklistDone),
        status: updatedStatus,
      });
      setDetailWO((prev: any) => ({ ...prev, serviceProgress: JSON.stringify(serviceProgress), obraObservations, checklistDone: JSON.stringify(checklistDone), status: updatedStatus }));
      toast({ title: "Registro de obra salvo!" });
    } finally {
      setSavingObra(false);
    }
  };

  const finalizarObra = async () => {
    if (!detailWO) return;
    const allServicesFinished = serviceProgress.every(sp => sp.finished);
    if (!allServicesFinished) {
      toast({ title: "Marque todos os serviÃ§os como concluÃ­dos antes de finalizar", variant: "destructive" });
      return;
    }
    const checklistComplete = CHECKLIST_ITEMS.every(item => checklistDone[item.key]);
    if (!checklistComplete) {
      toast({ title: "Checklist tÃ©cnico incompleto. Marque todos os itens antes de finalizar.", variant: "destructive" });
      return;
    }
    // Check pending materials
    if (pendingMaterials.length > 0 && !ignorePendingMaterials) {
      setIgnorePendingMaterials(true);
      toast({
        title: `âš ï¸ ${pendingMaterials.length} retirada(s) de material sem retorno`,
        description: "Confirme novamente para finalizar mesmo assim, ou registre o retorno primeiro no Controle de Materiais.",
        variant: "destructive",
      });
      return;
    }
    const reconciliationPending = materialReconciliation?.items?.filter(item => item.pending > 0) || [];
    if (reconciliationPending.length > 0 && !ignorePendingMaterials) {
      setIgnorePendingMaterials(true);
      toast({
        title: `${reconciliationPending.length} material(is) pendente(s) na reconciliacao`,
        description: "Confira Planejado x Retirado x Consumido x Devolvido antes de finalizar. Confirme novamente para continuar.",
        variant: "destructive",
      });
      return;
    }
    setIgnorePendingMaterials(false);
    setFinalizando(true);
    try {
      // 1. Call finalizar endpoint â†’ marks ConcluÃ­da + creates Garantia
      const result = await apiRequest("POST", `/api/work-orders/${detailWO.id}/finalizar`);
      setWarrantyCreated(result.warranty);
      setPostSaleCreated(result.postSale);
      setDetailWO((prev: any) => ({ ...prev, status: "ConcluÃ­da" }));
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warranties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nps-responses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      // 2. Auto-generate PDF
      generateWorkOrderReport(result.warranty);
      toast({
        title: "âœ… Obra finalizada com sucesso!",
        description: "RelatÃ³rio, garantia e pÃ³s-venda foram sinalizados automaticamente.",
      });
    } catch {
      toast({ title: "Erro ao finalizar obra", variant: "destructive" });
    } finally {
      setFinalizando(false);
    }
  };

  // â”€â”€ Pending materials for this work order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: pendingMaterials = [] } = useQuery<any[]>({
    queryKey: ["/api/work-orders", detailWO?.id, "pending-materials"],
    queryFn: () => detailWO ? apiRequest("GET", `/api/work-orders/${detailWO.id}/pending-materials`) : Promise.resolve([]),
    enabled: !!detailWO,
  });

  const { data: materialReconciliation = null, isLoading: isLoadingMaterialReconciliation } = useQuery<WorkOrderMaterialReconciliationResponse | null>({
    queryKey: ["/api/work-orders", detailWO?.id, "material-reconciliation"],
    queryFn: () => detailWO ? apiRequest("GET", `/api/work-orders/${detailWO.id}/material-reconciliation`) : Promise.resolve(null),
    enabled: !!detailWO,
  });

  // â”€â”€ Consumption log query + mutation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: consumoLogs = [] } = useQuery({
    queryKey: ["/api/obra-consumo-logs", detailWO?.id],
    queryFn: () => detailWO ? apiRequest("GET", `/api/obra-consumo-logs?workOrderId=${detailWO.id}`) : Promise.resolve([]),
    enabled: !!detailWO,
  });

  const createConsumoMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/obra-consumo-logs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/obra-consumo-logs", detailWO?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", detailWO?.id, "material-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
    },
  });

  const deleteConsumoMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/obra-consumo-logs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/obra-consumo-logs", detailWO?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", detailWO?.id, "material-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
    },
  });

  const handleRegistrarConsumo = async () => {
    if (!detailWO) return;
    const sp = serviceProgress[selectedConsumoSvcIdx];
    if (!sp) return;

    const entries = sp.realMaterials
      .map((mat, idx) => ({ mat, qty: Math.ceil(Number(consumoInputs[idx] || 0)) }))
      .filter(e => e.qty > 0);

    if (entries.length === 0) {
      toast({ title: "Informe ao menos uma quantidade", variant: "destructive" });
      return;
    }

    setSavingConsumo(true);
    try {
      for (const e of entries) {
        await createConsumoMut.mutateAsync({
          workOrderId: detailWO.id,
          serviceName: sp.serviceName,
          materialName: e.mat.name,
          inventoryId: e.mat.inventoryId || null,
          quantity: e.qty,
          notes: consumoNotes || null,
        });
      }
      setConsumoInputs({});
      setConsumoNotes("");
      toast({ title: `âœ… ${entries.length} lanÃ§amento(s) registrado(s) por ${currentUser?.username}!` });
    } catch {
      toast({ title: "Erro ao registrar consumo", variant: "destructive" });
    } finally {
      setSavingConsumo(false);
    }
  };

  const allPhotos = detailWO?.photos ? JSON.parse(detailWO.photos) : [];

  const generateWorkOrderReport = (warrantyOverride?: any) => {
    if (!detailWO) return;
    generateWorkOrderReportPdf(detailWO, serviceProgress, allPhotos, {
      checklistItems: CHECKLIST_ITEMS,
      checklistDone,
      warranty: warrantyOverride || warrantyCreated,
      obraObservations,
    });
  };
  const allExceeded = useMemo(() => serviceProgress.flatMap(sp => getExceededMaterials(sp).map(e => ({ ...e, service: sp.serviceName }))), [serviceProgress]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" /> Ordens de ServiÃ§o
          </h1>
          <p className="text-slate-500 mt-1">Gerencie ordens, equipes, materiais e o registro de obra.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button onClick={openNew} className="min-h-11 w-full sm:w-auto" data-testid="button-new-wo">
            <Plus className="w-5 h-5 mr-2" /> Criar Ordem
          </Button>
        </div>
      </div>

      <WorkOrderList
        workOrders={filteredWO}
        isLoading={isLoadingWorkOrders}
        search={search}
        statusColors={STATUS_COLORS}
        onSearchChange={setSearch}
        onWhatsApp={openWAModal}
        onDetail={wo => {
          setDetailWO(wo);
          openDetail(wo);
          setIsDetailOpen(true);
        }}
        onEdit={openEdit}
        onDelete={wo => {
          if (confirm("Deletar ordem?")) deleteWO.mutate(wo.id);
        }}
      />

      <WorkOrderDetailModal
        isOpen={isDetailOpen}
        workOrder={detailWO}
        activeTab={activeDetailTab}
        statusColors={STATUS_COLORS}
        serviceProgress={serviceProgress}
        allPhotos={allPhotos}
        allExceeded={allExceeded}
        currentUsername={currentUser?.username}
        selectedConsumoSvcIdx={selectedConsumoSvcIdx}
        consumoInputs={consumoInputs}
        consumoNotes={consumoNotes}
        savingConsumo={savingConsumo}
        consumoLogs={consumoLogs as any[]}
        pendingMaterials={pendingMaterials}
        materialReconciliation={materialReconciliation}
        isLoadingMaterialReconciliation={isLoadingMaterialReconciliation}
        ignorePendingMaterials={ignorePendingMaterials}
        obraObservations={obraObservations}
        checklistItems={CHECKLIST_ITEMS}
        checklistDone={checklistDone}
        warrantyCreated={warrantyCreated}
        postSaleCreated={postSaleCreated}
        savingObra={savingObra}
        finalizando={finalizando}
        onClose={() => setIsDetailOpen(false)}
        onTabChange={setActiveDetailTab}
        onGenerateReport={() => generateWorkOrderReport()}
        onResetFromJob={() => {
          const relatedJob = jobs.find((job: any) => job.id === detailWO?.jobId) || null;
          setServiceProgress(buildProgressFromJob(detailWO, relatedJob));
        }}
        onUpdateService={updateSP}
        onUpdateRealMaterial={updateRealMat}
        onAddService={addServiceToProgress}
        onSelectConsumoService={index => {
          setSelectedConsumoSvcIdx(index);
          setConsumoInputs({});
        }}
        onConsumoInputChange={(index, value) => setConsumoInputs(prev => ({ ...prev, [index]: value }))}
        onConsumoNotesChange={setConsumoNotes}
        onRegistrarConsumo={handleRegistrarConsumo}
        onDeleteConsumo={id => deleteConsumoMut.mutate(id)}
        onFileUpload={handleFileUpload}
        onObraObservationsChange={setObraObservations}
        onChecklistChange={(key, checked) => setChecklistDone(prev => ({ ...prev, [key]: checked }))}
        onSave={saveObraProgress}
        onFinalize={finalizarObra}
      />

      <WorkOrderForm
        isOpen={isModalOpen}
        editingWO={editingWO}
        clientName={clientName}
        address={address}
        serviceType={serviceType}
        scheduledDate={scheduledDate}
        teamAssigned={teamAssigned}
        status={status}
        notes={notes}
        photos={photos}
        isSaving={createWO.isPending || updateWO.isPending}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        onClientNameChange={setClientName}
        onAddressChange={setAddress}
        onServiceTypeChange={setServiceType}
        onScheduledDateChange={setScheduledDate}
        onTeamAssignedChange={setTeamAssigned}
        onStatusChange={setStatus}
        onNotesChange={setNotes}
        onFileUpload={handleFileUpload}
        onRemovePhoto={removePhoto}
      />

      {/* WhatsApp Send Modal */}
      {waWO.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" data-testid="wa-modal">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center gap-3 p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
                <SiWhatsapp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">Enviar AtualizaÃ§Ã£o via WhatsApp</h2>
                <p className="text-xs text-gray-400">OS #{waWO.wo?.id} â€” {waWO.wo?.serviceType}</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />NÃºmero do WhatsApp *
                </label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={waPhone}
                  onChange={e => setWaPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:outline-none focus:border-green-500 text-sm"
                  data-testid="wa-phone-input"
                />
                <p className="text-xs text-gray-400">DDD + nÃºmero (cÃ³digo +55 adicionado automaticamente)</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Mensagem</label>
                <textarea
                  value={waMessage}
                  onChange={e => setWaMessage(e.target.value)}
                  rows={6}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:outline-none focus:border-green-500 text-sm resize-none font-mono leading-relaxed"
                  data-testid="wa-message-input"
                />
                <p className="text-xs text-gray-400">{waMessage.length} caracteres</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-start gap-2 text-xs text-green-700 dark:text-green-400">
                <MessageCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                O WhatsApp abrirÃ¡ com a mensagem jÃ¡ preenchida â€” basta clicar em Enviar.
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setWaWO({ open: false, wo: null })} className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" data-testid="wa-cancel-btn">Cancelar</button>
              <button
                onClick={handleWASend}
                disabled={waPhone.replace(/\D/g, "").length < 10 || !waMessage.trim()}
                className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                data-testid="wa-send-btn"
              >
                <SiWhatsapp className="w-4 h-4" />Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
