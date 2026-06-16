import React, { useState, useMemo } from "react";
import { useJobs, useCreateJob, useUpdateJob, useDeleteJob } from "@/hooks/use-jobs";
import { useServices } from "@/hooks/use-services";
import { useClients } from "@/hooks/use-clients";
import { useJobScoring } from "@/hooks/use-job-scoring";
import { useCostConfig } from "@/hooks/use-cost-config";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { Plus, Search, Briefcase, FileText, X, Users, Hash, CreditCard } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { gerarOrcamentoPDF, mergeQuoteTemplateConfig } from "@/lib/orcamentoPDF";
import type { MaterialDisplayMode, QuoteTemplateConfig } from "@/lib/orcamentoPDF";
import { asArray } from "@/lib/safeData";
import { useJobStatuses } from "@/hooks/use-job-statuses";
import { QuoteClientSection } from "@/features/quotes/components/QuoteClientSection";
import { QuoteFinancialAnalysis } from "@/features/quotes/components/QuoteFinancialAnalysis";
import { QuoteForm } from "@/features/quotes/components/QuoteForm";
import { QuoteServiceItems } from "@/features/quotes/components/QuoteServiceItems";
import { QuotesList } from "@/features/quotes/components/QuotesList";
import { evaluateMargin, validateDiscount, calculateTotalCost, getCombinedRecommendation } from "@shared/marginEngine";
import { calculateScore } from "@shared/scoringEngine";
import { usePriorityRules } from "@/hooks/use-priority-rules";
import { useSettings } from "@/hooks/use-settings";
import { PrivacyToggle } from "@/components/PrivacyToggle";
import { usePrivacyMask } from "@/hooks/use-privacy-mask";

interface ServiceItemForm {
  _id: string;
  lugar?: string;
  name: string;
  description?: string;
  area: string;
  unitPrice: string;
  total: number;
}
const makeItem = (): ServiceItemForm => ({
  _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  lugar: "", name: "", description: "", area: "", unitPrice: "", total: 0,
});

interface ClienteForm {
  _id: string;
  nome: string;
  cargo: string;
  telefone: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  endereco: string;
}
const makeCliente = (): ClienteForm => ({
  _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  nome: "", cargo: "Proprietário", telefone: "",
  rua: "", numero: "", bairro: "", cidade: "", estado: "SP", cep: "",
  endereco: "",
});

interface ResponsavelForm {
  _id: string;
  nome: string;
  cargo: string;
  telefone: string;
}
const makeResponsavel = (): ResponsavelForm => ({
  _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  nome: "", cargo: "Encarregado", telefone: "",
});

export default function Jobs() {
  const { data: jobs = [], isLoading } = useJobs();
  const { data: services = [] } = useServices();
  const { data: clients = [] } = useClients();
  const { data: jobStatusConfigs = [] } = useJobStatuses();
  const { data: costConfig } = useCostConfig();
  const { data: inventoryItems = [] } = useQuery<any[]>({ queryKey: ["/api/inventory"] });
  const { data: workOrders = [] } = useQuery<any[]>({ queryKey: ["/api/work-orders"] });
  const { data: paymentMethodsList = [] } = useQuery<any[]>({ queryKey: ["/api/payment-methods"] });
  const { data: paymentConditionsList = [] } = useQuery<any[]>({ queryKey: ["/api/payment-conditions"] });
  const { data: settings = [] } = useSettings();
  const { privacyMaskEnabled, togglePrivacyMask, maskText, maskMoney, maskNumber } = usePrivacyMask();
  const jobsList = asArray<any>(jobs);
  const servicesList = asArray<any>(services);
  const clientsList = asArray<any>(clients);
  const jobStatuses = asArray<any>(jobStatusConfigs);
  const inventoryItemsList = asArray<any>(inventoryItems);
  const workOrdersList = asArray<any>(workOrders);
  const paymentMethods = asArray<any>(paymentMethodsList);
  const paymentConditions = asArray<any>(paymentConditionsList);
  const settingsList = asArray<any>(settings);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: priorityRules } = usePriorityRules();
  const { jobsWithScores } = useJobScoring(jobsList);
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [discountPercent, setDiscountPercent] = useState("");
  const [orcamentoNumero, setOrcamentoNumero] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [selectedConditionIds, setSelectedConditionIds] = useState<number[]>([]);
  const [materialDisplayMode, setMaterialDisplayMode] = useState<MaterialDisplayMode>("material_mdo");
  const [showMaterialsToClient, setShowMaterialsToClient] = useState(true);

  // WhatsApp confirmation modal state
  const [waModal, setWaModal] = useState<{
    open: boolean;
    waUrl: string;
    message: string;
    clientName: string;
    statusName: string;
    pdfIncluded: boolean;
    pdfFileName: string;
  }>({ open: false, waUrl: "", message: "", clientName: "", statusName: "", pdfIncluded: false, pdfFileName: "" });

  // Form State
  const [clientId, setClientId] = useState(""); // optional CRM FK link
  const [clientes, setClientes] = useState<ClienteForm[]>([makeCliente()]);
  const [distanceKm, setDistanceKm] = useState("0");
  const [status, setStatus] = useState("Lead");
  const [locationRegion, setLocationRegion] = useState("Zona A");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [executionDeadline, setExecutionDeadline] = useState("");
  const [responsaveis, setResponsaveis] = useState<ResponsavelForm[]>([makeResponsavel()]);

  // Multi-service items
  const [multiItems, setMultiItems] = useState<ServiceItemForm[]>([makeItem()]);

  // Derived clientName from first cliente (for DB field)
  const clientName = clientes[0]?.nome.trim() || "";

  // Derived single-service values (for backward-compat with scoring engine)
  const serviceType = multiItems.length === 1 ? (multiItems[0].name || "") : (multiItems.some(i => i.name) ? "Multi-serviços" : "");
  const squareMeters = multiItems.reduce((s, i) => s + (Number(i.area) || 0), 0).toString();
  const totalOrcamento = multiItems.reduce((s, i) => s + i.total, 0);

  // Multi-service item helpers
  const updateItem = (id: string, field: "name" | "area" | "unitPrice", value: string) => {
    setMultiItems(prev => prev.map(item => {
      if (item._id !== id) return item;
      const updated = { ...item, [field]: value };
      const area = field === "area" ? Number(value) : Number(updated.area);
      const up = field === "unitPrice" ? Number(value) : Number(updated.unitPrice);
      updated.total = (area || 0) * (up || 0);
      return updated;
    }));
  };
  const updateItemDescription = (id: string, description: string) => {
    setMultiItems(prev => prev.map(item => item._id !== id ? item : { ...item, description }));
  };
  const handleItemService = (id: string, svcName: string) => {
    const svc = servicesList.find(s => s.name === svcName);
    setMultiItems(prev => prev.map(item => {
      if (item._id !== id) return item;
      const unitPrice = svc ? (svc.pricePerUnit ?? 0).toFixed(2) : "";
      const area = Number(item.area) || 0;
      return { ...item, name: svcName, description: svc?.description || "", unitPrice, total: area * (Number(unitPrice) || 0) };
    }));
  };
  const addItem = () => setMultiItems(prev => [...prev, makeItem()]);
  const removeItem = (id: string) => setMultiItems(prev => prev.filter(i => i._id !== id));


  // Budget calculation
  const distKm = Number(distanceKm) || 0;
  const getSetting = (key: string, defaultValue: number) => {
    const setting = settingsList.find((item: any) => item.key === key);
    return Number(setting?.value ?? defaultValue);
  };
  const normalizePercent = (value: number) => (value > 1 ? value / 100 : value);
  const regionPercentMap: Record<string, number> = {
    "Zona A": 0,
    "Zona B": normalizePercent(getSetting("regionBZonePercent", 0.15)),
    "Zona C": normalizePercent(getSetting("regionCZonePercent", 0.25)),
  };
  const regionalAdjustmentPercent = regionPercentMap[locationRegion] ?? 0;

  // Multi-service cost analysis (sum costs across all services)
  const multiCostAnalysis = useMemo(() => {
    if (!costConfig || multiItems.length === 0) return null;
    let totalMaterialBase = 0, totalLabor = 0, totalTransport = 0;
    multiItems.forEach(item => {
      const svc = servicesList.find(s => s.name === item.name);
      const area = Number(item.area) || 0;
      if (!svc || area === 0) return;
      const calc = calculateTotalCost(
        { squareMeters: area, distanceKm: distKm, serviceMaterialCostPerM2: svc.materialConsumptionPerM2, serviceLaborCostPerM2: svc.laborCostPerM2, serviceTransportCostPerM2: svc.transportCostPerM2 },
        costConfig,
      );
      totalMaterialBase += calc.materialCost;
      totalLabor += calc.laborCost;
      totalTransport += calc.transportCost;
    });
    const materialRegionalIncrease = totalMaterialBase * regionalAdjustmentPercent;
    const totalMaterial = totalMaterialBase + materialRegionalIncrease;
    const directCost = totalMaterial + totalLabor + totalTransport;
    const suggestedPrice = directCost > 0 ? directCost / (1 - costConfig.minMarginPercent) : 0;
    return { materialCost: totalMaterial, baseMaterialCost: totalMaterialBase, materialRegionalIncrease, regionalAdjustmentPercent, laborCost: totalLabor, transportCost: totalTransport, directCost, suggestedPrice };
  }, [multiItems, distKm, servicesList, costConfig, regionalAdjustmentPercent]);

  const filteredJobs = jobsWithScores.filter(j => 
    j.clientName.toLowerCase().includes(search.toLowerCase()) || 
    j.serviceType.toLowerCase().includes(search.toLowerCase())
  );

  // Margin evaluation based on multi-service totals
  const directCostNum = multiCostAnalysis?.directCost || 0;
  const finalPriceNum = totalOrcamento > 0 ? totalOrcamento : (multiCostAnalysis?.suggestedPrice || 0);
  const discountNum = Number(discountPercent) || 0;
  const priceAfterDiscount = discountNum > 0 ? finalPriceNum * (1 - discountNum / 100) : finalPriceNum;
  const marginEval = costConfig && directCostNum > 0 && finalPriceNum > 0
    ? evaluateMargin(priceAfterDiscount, directCostNum, costConfig)
    : null;
  const discountValidation = costConfig && discountNum > 0 && directCostNum > 0
    ? validateDiscount(finalPriceNum, discountNum, directCostNum, costConfig)
    : null;

  // Combined priority + margin recommendation
  const sqm = Number(squareMeters) || 0;
  const budgetPriorityScore = priorityRules && serviceType && sqm > 0
    ? calculateScore(
        { serviceType, squareMeters: sqm, distanceKm: distKm,
          estimatedReturnLevel: finalPriceNum > 0 && directCostNum > 0
            ? ((finalPriceNum - directCostNum) / finalPriceNum > 0.3 ? "Alto" : (finalPriceNum - directCostNum) / finalPriceNum > 0.15 ? "Médio" : "Baixo")
            : "Médio" },
        priorityRules,
      )
    : null;
  const combinedRec = marginEval && budgetPriorityScore
    ? getCombinedRecommendation(budgetPriorityScore.recommendation, marginEval.status, budgetPriorityScore.priority)
    : null;

  const openNew = () => {
    setEditingJob(null);
    setClientId(""); setDistanceKm("0"); setStatus("Lead");
    setLocationRegion("Zona A"); setInspectionNotes(""); setExecutionDeadline("");
    setDiscountPercent("");
    setSelectedConditionIds([]);
    setMaterialDisplayMode("material_mdo");
    setShowMaterialsToClient(true);
    setClientes([makeCliente()]);
    setMultiItems([makeItem()]);
    setResponsaveis([makeResponsavel()]);
    // Keep numbering stable with existing records.
    const maxNum = jobsList.length > 0
      ? Math.max(...jobsList.map((j: any) => j.orcamentoNumero ?? j.id ?? 0))
      : 0;
    setOrcamentoNumero(String(maxNum + 1));
    setIsModalOpen(true);
  };

  const openEdit = (job: any) => {
    setEditingJob(job);
    setClientId(job.clientId?.toString() || ""); setStatus(job.status);
    setLocationRegion(["Zona A", "Zona B", "Zona C"].includes(job.locationRegion) ? job.locationRegion : "Zona A");
    setInspectionNotes(job.inspectionNotes || "");
    setExecutionDeadline(job.executionDeadline ? new Date(job.executionDeadline).toISOString().split("T")[0] : "");
    setDiscountPercent("");
    setOrcamentoNumero(String(job.orcamentoNumero ?? job.id ?? ""));
    setPaymentMethodId(job.paymentMethodId?.toString() || "");
    try { setSelectedConditionIds(job.paymentConditionIds ? JSON.parse(job.paymentConditionIds) : []); } catch { setSelectedConditionIds([]); }
    // Restore PDF presentation options
    try {
      const opts = job.pdfOptions ? JSON.parse(job.pdfOptions) : {};
      setMaterialDisplayMode(opts.materialDisplayMode ?? "material_mdo");
      setShowMaterialsToClient(opts.showMaterialsToClient !== false);
    } catch {
      setMaterialDisplayMode("material_mdo");
      setShowMaterialsToClient(true);
    }

    if (job.clientes) {
      try {
        const parsed = JSON.parse(job.clientes);
        setClientes(parsed.map((c: any) => ({
          _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          nome: c.nome || "", cargo: c.cargo || "Proprietário",
          telefone: c.telefone || "",
          rua: c.rua || c.endereco || "", numero: c.numero || "", bairro: c.bairro || "",
          cidade: c.cidade || "", estado: c.estado || "SP", cep: c.cep || "",
          endereco: c.endereco || c.rua || "",
        })));
      } catch { setClientes([makeCliente()]); }
    } else {
      const cr = clientsList.find((c: any) => c.id === job.clientId || c.name === job.clientName);
      setClientes([{
        _id: `${Date.now()}`,
        nome: job.clientName || "",
        cargo: "Proprietário",
        telefone: cr?.phone || "",
        rua: cr?.address || "", numero: "", bairro: "",
        cidade: cr?.city || "", estado: cr?.state || "SP", cep: "",
        endereco: cr?.address || "",
      }]);
    }

    if (job.responsaveis) {
      try {
        const parsed = JSON.parse(job.responsaveis);
        setResponsaveis(parsed.map((r: any) => ({
          _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          nome: r.nome || "", cargo: r.cargo || "Encarregado", telefone: r.telefone || "",
        })));
      } catch {
        setResponsaveis([makeResponsavel()]);
      }
    } else if (job.technicianAssigned) {
      setResponsaveis([{
        _id: `${Date.now()}`,
        nome: job.technicianAssigned, cargo: "Encarregado", telefone: "",
      }]);
    } else {
      setResponsaveis([makeResponsavel()]);
    }

    // Restore multi-service items (or fall back to single service)
    if (job.serviceItems) {
      try {
        const parsed = JSON.parse(job.serviceItems);
        setMultiItems(parsed.map((i: any) => ({
          _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          lugar: i.lugar || "", name: i.name || "", description: i.description || "", area: String(i.area || ""), unitPrice: String(i.unitPrice || ""), total: i.total || 0,
        })));
      } catch {
        const svc = servicesList.find(s => s.name === job.serviceType);
        const up = svc?.pricePerUnit ?? 0;
        setMultiItems([{ _id: `${Date.now()}`, name: job.serviceType || "", area: String(job.squareMeters || ""), unitPrice: up.toFixed(2), total: up * (Number(job.squareMeters) || 0) }]);
      }
    } else {
      const svc = servicesList.find(s => s.name === job.serviceType);
      const up = svc?.pricePerUnit ?? 0;
      setMultiItems([{ _id: `${Date.now()}`, name: job.serviceType || "", area: String(job.squareMeters || ""), unitPrice: up.toFixed(2), total: up * (Number(job.squareMeters) || 0) }]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = multiItems.filter(i => i.name && Number(i.area) > 0);
    if (validItems.length === 0) {
      alert("Adicione pelo menos um serviço com área válida.");
      return;
    }

    const totalSqm = validItems.reduce((s, i) => s + (Number(i.area) || 0), 0);
    const totalPrice = validItems.reduce((s, i) => s + i.total, 0);
    const primaryService = validItems.length === 1 ? validItems[0].name : "Multi-serviços";
    const serviceItemsJson = JSON.stringify(validItems.map(i => ({ lugar: i.lugar || "", name: i.name, description: i.description || "", area: Number(i.area), unitPrice: Number(i.unitPrice), total: i.total })));
    // Auto-calculated: sum of services minus any discount percentage
    const priceSold = priceAfterDiscount > 0 ? priceAfterDiscount : totalPrice;

    // Enforce prohibited-margin rule
    if (costConfig && priceSold > 0 && multiCostAnalysis && multiCostAnalysis.directCost > 0) {
      const me = evaluateMargin(priceSold, multiCostAnalysis.directCost, costConfig);
      if (me.status === "RECUSAR" && me.level === "PROIBIDA") {
        alert(`Não é possível salvar este orçamento.\n\n${me.reason}\n\nAjuste o preço antes de salvar.`);
        return;
      }
    }

    // Serialize clientes (structured address fields + backward-compat endereco)
    const validClientes = clientes.filter(c => c.nome.trim());
    const clientesJson = validClientes.length > 0
      ? JSON.stringify(validClientes.map(c => {
          const ruaNum = [c.rua, c.numero].filter(Boolean).join(", ");
          const enderecoCompacto = [ruaNum, c.bairro].filter(Boolean).join(" - ");
          return {
            nome: c.nome, cargo: c.cargo, telefone: c.telefone,
            rua: c.rua, numero: c.numero, bairro: c.bairro,
            cidade: c.cidade, estado: c.estado, cep: c.cep,
            // backward-compat field: combined address for older code paths
            endereco: enderecoCompacto || c.endereco,
          };
        }))
      : undefined;
    const primaryClientName = validClientes[0]?.nome || clientName;

    // Serialize responsáveis
    const validResp = responsaveis.filter(r => r.nome.trim());
    const responsaveisJson = validResp.length > 0
      ? JSON.stringify(validResp.map(r => ({ nome: r.nome, cargo: r.cargo, telefone: r.telefone })))
      : undefined;

    const payload = {
      clientId: Number(clientId) || undefined,
      clientName: primaryClientName,
      serviceType: primaryService,
      squareMeters: totalSqm,
      status,
      realPriceSold: priceSold,
      locationRegion: locationRegion || undefined,
      inspectionNotes: inspectionNotes || undefined,
      executionDeadline: executionDeadline ? new Date(executionDeadline) : undefined,
      clientes: clientesJson,
      responsaveis: responsaveisJson,
      serviceItems: serviceItemsJson,
      orcamentoNumero: orcamentoNumero ? parseInt(orcamentoNumero) : undefined,
      paymentMethodId: paymentMethodId ? Number(paymentMethodId) : undefined,
      paymentConditionIds: selectedConditionIds.length > 0 ? JSON.stringify(selectedConditionIds) : undefined,
      pdfOptions: JSON.stringify({ materialDisplayMode, showMaterialsToClient }),
    };
    if (editingJob) {
      await updateJob.mutateAsync({ id: editingJob.id, ...payload });
    } else {
      await createJob.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleGerarPDF = async (job: any) => {
    // Fetch the default template config
    let templateConfig: QuoteTemplateConfig = mergeQuoteTemplateConfig();
    try {
      const res = await fetch("/api/quote-templates/default", { credentials: "include" });
      if (res.ok) {
        const tpl = await res.json();
        const saved = JSON.parse(tpl.config);
        templateConfig = mergeQuoteTemplateConfig(saved);
      }
    } catch { /* use default */ }
    // Parse multi-service items if available
    let serviceItemsParsed: { name: string; area: number; unitPrice: number; total: number }[] | null = null;
    if (job.serviceItems) {
      try { serviceItemsParsed = JSON.parse(job.serviceItems); } catch { /* ignore */ }
    }

    // Build per-service cost breakdown, enriching with service description
    const rawItems = serviceItemsParsed && serviceItemsParsed.length > 0
      ? serviceItemsParsed
      : [{ name: job.serviceType, area: Number(job.squareMeters) || 0, unitPrice: 0, total: job.realPriceSold || 0 }];

    const items = rawItems.map((item: any) => ({
      ...item,
      description: item.description || servicesList.find((s: any) => s.name === item.name)?.description || undefined,
    }));

    let totalMaterial = 0, totalLabor = 0, totalTransport = 0;
    items.forEach(item => {
      const svc = servicesList.find(s => s.name === item.name);
      if (!svc || item.area === 0) return;
      if (costConfig) {
        const c = calculateTotalCost({ squareMeters: item.area, distanceKm: 0, serviceMaterialCostPerM2: svc.materialConsumptionPerM2, serviceLaborCostPerM2: svc.laborCostPerM2, serviceTransportCostPerM2: svc.transportCostPerM2 }, costConfig);
        totalMaterial += c.materialCost; totalLabor += c.laborCost; totalTransport += c.transportCost;
      } else {
        totalMaterial += item.area * svc.materialConsumptionPerM2;
        totalLabor += item.area * svc.laborCostPerM2;
        totalTransport += item.area * svc.transportCostPerM2;
      }
    });

    const pdfRegion = ["Zona A", "Zona B", "Zona C"].includes(job.locationRegion) ? job.locationRegion : "Zona A";
    const pdfRegionalAdjustmentPercent = regionPercentMap[pdfRegion] ?? 0;
    totalMaterial = totalMaterial * (1 + pdfRegionalAdjustmentPercent);
    const directCost = totalMaterial + totalLabor + totalTransport;
    const finalPrice = job.realPriceSold > 0 ? job.realPriceSold : (directCost > 0 ? directCost / (1 - (costConfig?.minMarginPercent || 0.3)) : 0);
    const marginPct = directCost > 0 && finalPrice > 0 ? (finalPrice - directCost) / finalPrice : (costConfig?.minMarginPercent || 0.3);

    // Preserve compatibility with older records that only have clientName.
    let clientesPDF: { nome: string; cargo: string; telefone?: string; endereco?: string; cidade?: string }[] | undefined;
    if (job.clientes) {
      try {
        const rawClientes = JSON.parse(job.clientes);
        clientesPDF = rawClientes.map((c: any) => {
          const ruaNum = [c.rua, c.numero].filter(Boolean).join(", ");
          const enderecoCompacto = [ruaNum, c.bairro].filter(Boolean).join(" - ") || c.endereco || "";
          const cidadeEstado = c.cidade && c.estado ? `${c.cidade}/${c.estado}` : (c.cidade || "");
          const cidadeCompacta = c.cep ? `${cidadeEstado} — CEP ${c.cep}` : cidadeEstado;
          return {
            nome: c.nome, cargo: c.cargo,
            telefone: c.telefone || "",
            endereco: enderecoCompacto,
            cidade: cidadeCompacta || c.cidade || "",
          };
        });
      } catch { /* ignore */ }
    } else {
      const cr = clientsList.find((c: any) => c.id === job.clientId || c.name === job.clientName);
      clientesPDF = [{
        nome: job.clientName,
        cargo: "Proprietário",
        telefone: cr?.phone || "",
        endereco: cr?.address || "",
        cidade: cr?.city ? `${cr.city}${cr.state ? " – " + cr.state : ""}` : "",
      }];
    }

    // Preserve compatibility with older records that only have technicianAssigned.
    let responsaveisPDF: { nome: string; cargo: string; telefone?: string }[] | undefined;
    if (job.responsaveis) {
      try { responsaveisPDF = JSON.parse(job.responsaveis); } catch { /* ignore */ }
    } else if (job.technicianAssigned) {
      responsaveisPDF = [{ nome: job.technicianAssigned, cargo: "Encarregado", telefone: "" }];
    }

    const clientRecord = clientsList.find((c: any) => c.id === job.clientId || c.name === job.clientName);

    let paymentConditionsPDF: { name: string; fullText: string }[] | undefined;
    if (job.paymentConditionIds) {
      try {
        const ids: number[] = JSON.parse(job.paymentConditionIds);
        if (ids.length > 0) {
          paymentConditionsPDF = paymentConditions
            .filter((c: any) => ids.includes(c.id) && c.active !== false)
            .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map((c: any) => ({ name: c.name, fullText: c.fullText }));
        }
      } catch { /* ignore parse errors */ }
    }

    let jobMaterialDisplayMode: MaterialDisplayMode = "material_mdo";
    let jobShowMaterialsToClient = true;
    try {
      const opts = job.pdfOptions ? JSON.parse(job.pdfOptions) : {};
      jobMaterialDisplayMode = opts.materialDisplayMode ?? "material_mdo";
      jobShowMaterialsToClient = opts.showMaterialsToClient !== false;
    } catch { /* use defaults */ }

    gerarOrcamentoPDF({
      id: job.id,
      orcamentoNumero: job.orcamentoNumero ?? undefined,
      cliente: job.clientName,
      clientePhone: clientRecord?.phone || undefined,
      clienteEndereco: clientRecord?.address || undefined,
      clienteCidade: clientRecord?.city
        ? `${clientRecord.city}${clientRecord.state ? " – " + clientRecord.state : ""}`
        : undefined,
      clientes: clientesPDF,
      responsaveis: responsaveisPDF,
      servico: job.serviceType,
      areaM2: Number(job.squareMeters) || 0,
      serviceItems: items,
      materialCost: totalMaterial,
      laborCost: totalLabor,
      transportCost: totalTransport,
      directCost,
      finalPrice,
      margin: marginPct,
      observacoes: job.inspectionNotes,
      regiaoLocalizacao: job.locationRegion,
      dataOrcamento: job.createdAt ? new Date(job.createdAt).toLocaleDateString("pt-BR") : undefined,
      paymentConditions: paymentConditionsPDF,
      materialDisplayMode: jobMaterialDisplayMode,
      showMaterialsToClient: jobShowMaterialsToClient,
    }, templateConfig);
  };

  const handleEnviarWhatsApp = async (job: any) => {
    let phone = "";
    let clientFirstName = job.clientName?.split(" ")[0] || "Cliente";

    if (job.clientes) {
      try {
        const parsed: { nome: string; telefone?: string }[] = JSON.parse(job.clientes);
        if (parsed.length > 0) {
          clientFirstName = parsed[0].nome?.split(" ")[0] || clientFirstName;
          phone = parsed.find(c => c.telefone)?.telefone || "";
        }
      } catch { /* ignore */ }
    }

    if (!phone) {
      const cr = clientsList.find((c: any) => c.id === job.clientId || c.name === job.clientName);
      phone = cr?.phone || "";
    }

    if (!phone) {
      alert("Nenhum telefone encontrado para este cliente. Edite o orçamento e adicione o número de WhatsApp do cliente.");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    const intlPhone = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;

    const displayNum = job.orcamentoNumero ?? job.id;
    const numFormatted = String(displayNum).padStart(4, "0");

    let statusConfigs: any[] = jobStatuses;
    if (!statusConfigs || statusConfigs.length === 0) {
      try {
        const res = await fetch("/api/job-statuses");
        if (res.ok) statusConfigs = await res.json();
      } catch { /* usa fallback */ }
    }

    const statusConfig = statusConfigs.find(
      (sc: any) => sc.name?.toLowerCase() === (job.status || "").toLowerCase()
    );

    let rawMessage = "";
    if (statusConfig?.message) {
      rawMessage = statusConfig.message;
    } else {
      rawMessage = "Olá {cliente}! Segue o orçamento solicitado da IMPPEL. Qualquer dúvida estou à disposição.\n\n Orçamento Nº {numero} — IMPPEL Impermeabilizações";
    }

    const msg = rawMessage
      .replace(/\{cliente\}/gi, clientFirstName)
      .replace(/\{numero\}/gi, numFormatted);

    // 6. Determine if PDF should be included (default = true)
    const shouldIncludePdf = statusConfig ? statusConfig.includePdf !== false : true;

    // 7. Generate PDF first (doc.save triggers browser download)
    if (shouldIncludePdf) {
      handleGerarPDF(job);
    }

    // 8. Download extra file if configured
    if (statusConfig?.extraFileData && statusConfig?.extraFileName) {
      const link = document.createElement("a");
      link.href = statusConfig.extraFileData;
      link.download = statusConfig.extraFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // 9. Build PDF filename reference
    const dataHoje = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    const nomeArquivo = (job.clientName || "cliente").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
    const pdfFileName = `IMPPEL_Orcamento_${numFormatted}_${nomeArquivo}_${dataHoje}.pdf`;

    // 10. Build WhatsApp URL
    const waUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;

    // 11. Open modal for user to confirm and open WhatsApp
    setWaModal({
      open: true,
      waUrl,
      message: msg,
      clientName: clientFirstName,
      statusName: job.status || "",
      pdfIncluded: shouldIncludePdf,
      pdfFileName,
    });
  };

  const handleInlineStatusChange = async (job: any, newStatus: string) => {
    if (job.status === newStatus) return;
    try {
      await updateJob.mutateAsync({ id: job.id, status: newStatus });

      const statusCfg = jobStatuses.find(
        (c: any) => c.name?.toLowerCase() === newStatus.toLowerCase()
      );

      if (statusCfg?.generateOs) {
        let serviceItemsParsed: any[] = [];
        if (job.serviceItems) {
          try { serviceItemsParsed = JSON.parse(job.serviceItems); } catch {}
        }

        const materialsMap: Record<number, { name: string; unit: string; inventoryUnit: string; quantity: number }> = {};
        for (const svcItem of serviceItemsParsed) {
          const svcCatalog = servicesList.find((s: any) =>
            s.name?.toLowerCase() === svcItem.name?.toLowerCase()
          );
          if (!svcCatalog?.serviceMaterials) continue;
          let mats: any[] = [];
          try { mats = JSON.parse(svcCatalog.serviceMaterials); } catch {}
          for (const mat of mats) {
            const area = Number(svcItem.area) || 0;
            const qty = mat.unit === "per_kg"
              ? Math.ceil((area * (Number(mat.kilosPerM2) || 0)) / (Number(mat.weightPerUnit) || 1))
              : mat.unit === "per_m2" ? mat.quantity * area : mat.quantity;
            const invItem = inventoryItemsList.find((it: any) => it.id === mat.inventoryId);
            const inventoryUnit = invItem?.unit || "unid";
            if (materialsMap[mat.inventoryId]) {
              materialsMap[mat.inventoryId].quantity += qty;
            } else {
              materialsMap[mat.inventoryId] = {
                name: mat.name,
                unit: mat.unit,
                inventoryUnit,
                quantity: qty,
              };
            }
          }
        }

        const materialsNeeded = Object.entries(materialsMap).map(([id, m]) => ({
          inventoryId: Number(id),
          name: m.name,
          quantity: Math.ceil(m.quantity),
          unit: m.unit,
          inventoryUnit: m.inventoryUnit,
        }));

        const address = (() => {
          if (job.clientes) {
            try {
              const cls = JSON.parse(job.clientes);
              if (cls[0]?.endereco) return cls[0].endereco + (cls[0].cidade ? `, ${cls[0].cidade}` : "");
            } catch {}
          }
          return "";
        })();

        const woPayload = {
          jobId: job.id,
          clientId: job.clientId || null,
          clientName: job.clientName,
          address,
          serviceType: job.serviceType,
          materialsNeeded: materialsNeeded.length > 0 ? JSON.stringify(materialsNeeded) : null,
          status: "Planejada",
          notes: `OS gerada automaticamente ao aprovar orçamento #${String(job.orcamentoNumero ?? job.id).padStart(4, "0")}`,
        };

        await fetch("/api/work-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(woPayload),
        });
        queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leads"] });

        toast({
          title: "OK Ordem de Serviço criada!",
          description: `Status → "${newStatus}" · OS gerada automaticamente com ${materialsNeeded.length} material(is) necessário(s).`,
        });
      }
    } catch (err: any) {
      alert(`Erro ao atualizar status: ${err.message}`);
    }
  };

  const statusColors: Record<string, string> = {
    "Lead": "bg-slate-100 text-slate-700",
    "Estimando": "bg-blue-100 text-blue-700",
    "Agendada": "bg-amber-100 text-amber-700",
    "Em Progresso": "bg-primary/10 text-primary border border-primary/20",
    "Concluída": "bg-emerald-100 text-emerald-700",
    "Faturada": "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-primary" />
            Orçamentos
          </h1>
          <p className="text-slate-500 mt-1">Gerencie orçamentos com cálculo automático de materiais.</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <PrivacyToggle enabled={privacyMaskEnabled} onToggle={togglePrivacyMask} />
          <Button className="justify-center" onClick={openNew} data-testid="button-new-job">
            <Plus className="w-5 h-5 mr-2" /> Criar Orçamento
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm w-full sm:max-w-md focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input 
            type="text"
            placeholder="Pesquisar orçamentos..."
            className="w-full bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="text-xs font-semibold text-slate-400 hover:text-primary">
              Limpar
            </button>
          )}
        </div>
        <span className="text-sm text-slate-500">
          {filteredJobs.length} de {jobsList.length} orçamento{jobsList.length === 1 ? "" : "s"}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">Nenhum orçamento encontrado</h3>
          <p className="text-slate-500 mt-2">{search ? "Ajuste a busca ou limpe o filtro." : "Crie o primeiro orçamento para começar."}</p>
          <div className="mt-5 flex justify-center gap-2">
            {search && <Button variant="outline" onClick={() => setSearch("")}>Limpar busca</Button>}
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo orçamento</Button>
          </div>
        </div>
      ) : (
        <QuotesList
          jobs={filteredJobs}
          jobsWithScores={jobsWithScores}
          services={servicesList}
          costConfig={costConfig}
          jobStatusConfigs={jobStatuses}
          workOrders={workOrdersList}
          statusColors={statusColors}
          onStatusChange={handleInlineStatusChange}
          onSendWhatsApp={handleEnviarWhatsApp}
          onGeneratePdf={handleGerarPDF}
          onEdit={openEdit}
          onDelete={(jobId) => {
            if (confirm("Tem certeza?")) deleteJob.mutate(jobId);
          }}
          privacyMaskEnabled={privacyMaskEnabled}
          maskText={maskText}
          maskMoney={maskMoney}
          maskNumber={maskNumber}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingJob ? `Editar Orçamento #${String(editingJob.orcamentoNumero ?? editingJob.id).padStart(4, "0")}` : "Novo Orçamento"}
        size="4xl"
      >
        <QuoteForm
          onSubmit={handleSubmit}
          serviceCount={multiItems.filter(i => i.name).length || 0}
          totalArea={Number(squareMeters || 0)}
          totalValue={totalOrcamento}
          primaryClientName={clientes.find(c => c.nome.trim())?.nome}
        >
          <div id="quote-basic" className="scroll-mt-28 grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 sm:flex sm:items-center">
            <Hash className="w-4 h-4 text-primary shrink-0" />
            <label className="text-sm font-semibold text-primary whitespace-nowrap">Nº do Orçamento</label>
            <input
              type="number"
              value={orcamentoNumero}
              onChange={e => setOrcamentoNumero(e.target.value)}
              min={1}
              className="col-span-2 w-full text-sm font-bold text-primary text-center border border-primary/30 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 sm:col-span-1 sm:w-28 sm:py-1.5"
              placeholder="Auto"
              data-testid="input-orcamento-numero"
            />
            <span className="col-span-2 text-xs text-slate-400 sm:col-span-1">Este número aparecerá no PDF do orçamento</span>
          </div>

          {paymentMethods.filter((p: any) => p.active).length > 0 && (
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center">
              <CreditCard className="w-4 h-4 text-slate-500 shrink-0" />
              <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Forma de Pagamento</label>
              <select
                value={paymentMethodId}
                onChange={e => setPaymentMethodId(e.target.value)}
                className="w-full flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 sm:py-1.5"
                data-testid="select-payment-method"
              >
                <option value="">Não definida</option>
                {paymentMethods.filter((p: any) => p.active).map((pm: any) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}{pm.discountPercent !== 0 ? ` (${pm.discountPercent > 0 ? "+" : ""}${pm.discountPercent}%)` : ""}
                  </option>
                ))}
              </select>
              {paymentMethodId && (() => {
                const pm = paymentMethods.find((p: any) => p.id === Number(paymentMethodId));
                if (!pm || pm.discountPercent === 0) return null;
                return (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pm.discountPercent < 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {pm.discountPercent < 0 ? `${Math.abs(pm.discountPercent)}% desconto` : `+${pm.discountPercent}% acréscimo`}
                  </span>
                );
              })()}
            </div>
          )}

          {paymentConditions.filter((c: any) => c.active !== false).length > 0 && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                <label className="text-sm font-semibold text-slate-700">Condições de Pagamento no PDF</label>
                {selectedConditionIds.length > 0 && (
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedConditionIds.length} selecionada{selectedConditionIds.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1">
                {paymentConditions
                  .filter((c: any) => c.active !== false)
                  .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
                  .map((c: any) => (
                    <label
                      key={c.id}
                      className={`flex items-start gap-2.5 cursor-pointer px-3 py-2 rounded-lg transition-colors border ${
                        selectedConditionIds.includes(c.id)
                          ? "bg-primary/5 border-primary/30"
                          : "bg-white border-transparent hover:bg-slate-100"
                      }`}
                      data-testid={`checkbox-condition-${c.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedConditionIds.includes(c.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedConditionIds(prev => [...prev, c.id]);
                          } else {
                            setSelectedConditionIds(prev => prev.filter(id => id !== c.id));
                          }
                        }}
                        className="w-4 h-4 mt-0.5 rounded accent-primary shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {c.fullText.length > 90 ? c.fullText.slice(0, 90) + "…" : c.fullText}
                        </p>
                      </div>
                    </label>
                  ))}
              </div>
            </div>
          )}

          <QuoteClientSection
            clients={clientsList}
            clientId={clientId}
            quoteClients={clientes}
            onClientIdChange={setClientId}
            onQuoteClientsChange={setClientes}
            createClient={makeCliente}
          />
          <QuoteServiceItems
            items={multiItems}
            services={servicesList}
            inventoryItems={inventoryItemsList}
            totalValue={totalOrcamento}
            privacyMaskEnabled={privacyMaskEnabled}
            maskText={maskText}
            maskMoney={maskMoney}
            maskNumber={maskNumber}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onUpdateItem={updateItem}
            onUpdateDescription={updateItemDescription}
            onUpdateLugar={(id, lugar) => setMultiItems(prev => prev.map(item => item._id === id ? { ...item, lugar } : item))}
            onSelectService={handleItemService}
          />
          <QuoteFinancialAnalysis
            distanceKm={distanceKm}
            onDistanceKmChange={setDistanceKm}
            multiCostAnalysis={multiCostAnalysis}
            directCostNum={directCostNum}
            locationRegion={locationRegion}
            regionalAdjustmentPercent={regionalAdjustmentPercent}
            discountPercent={discountPercent}
            onDiscountPercentChange={setDiscountPercent}
            discountNum={discountNum}
            discountValidation={discountValidation}
            priceAfterDiscount={priceAfterDiscount}
            totalOrcamento={totalOrcamento}
            marginEval={marginEval}
            combinedRec={combinedRec}
            costConfig={costConfig}
            materialDisplayMode={materialDisplayMode}
            onMaterialDisplayModeChange={setMaterialDisplayMode}
            showMaterialsToClient={showMaterialsToClient}
            onShowMaterialsToClientChange={setShowMaterialsToClient}
            privacyMaskEnabled={privacyMaskEnabled}
            maskMoney={maskMoney}
          />
          <div id="quote-final" className="scroll-mt-28 space-y-4 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
          <div className="space-y-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-sm font-semibold text-slate-700">Regiao e Localizacao</label>
              <span className="text-xs font-semibold text-primary">
                {locationRegion} · {(regionalAdjustmentPercent * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% sobre materiais
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["Zona A", "Zona B", "Zona C"] as const).map((zone) => {
                const percent = regionPercentMap[zone] ?? 0;
                const selected = locationRegion === zone;
                return (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => setLocationRegion(zone)}
                    className={`rounded-lg border px-3 py-3 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:bg-slate-50"
                    }`}
                    data-testid={`button-region-${zone.replace(" ", "-").toLowerCase()}`}
                  >
                    <span className="block text-sm font-bold">{zone}</span>
                    <span className="mt-0.5 block text-xs">
                      {percent > 0
                        ? `+${(percent * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% em materiais`
                        : "Padrao, sem acrescimo"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" /> Responsáveis / Equipe Técnica
              </label>
              <button
                type="button"
                onClick={() => setResponsaveis(prev => [...prev, makeResponsavel()])}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                data-testid="button-add-responsavel"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar responsável
              </button>
            </div>
            <div className="space-y-2">
              {responsaveis.map((resp, idx) => (
                <div key={resp._id} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_150px_150px_36px] sm:items-center">
                  <input
                    type="text"
                    value={resp.nome}
                    onChange={e => setResponsaveis(prev => prev.map(r => r._id === resp._id ? { ...r, nome: e.target.value } : r))}
                    placeholder="Nome completo *"
                    className="min-w-0 px-2 py-2 text-sm rounded-lg bg-white border border-slate-200 focus:outline-none focus:border-primary transition-all sm:py-1.5"
                    data-testid={`input-responsavel-nome-${idx}`}
                  />
                  <select
                    value={resp.cargo}
                    onChange={e => setResponsaveis(prev => prev.map(r => r._id === resp._id ? { ...r, cargo: e.target.value } : r))}
                    className="w-full px-2 py-2 text-sm rounded-lg bg-white border border-slate-200 focus:outline-none focus:border-primary transition-all sm:py-1.5"
                    data-testid={`select-responsavel-cargo-${idx}`}
                  >
                    <option value="Encarregado">Encarregado</option>
                    <option value="Engenheiro">Engenheiro</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Outro">Outro</option>
                  </select>
                  <input
                    type="text"
                    value={resp.telefone}
                    onChange={e => setResponsaveis(prev => prev.map(r => r._id === resp._id ? { ...r, telefone: e.target.value } : r))}
                    placeholder="Telefone"
                    className="w-full px-2 py-2 text-sm rounded-lg bg-white border border-slate-200 focus:outline-none focus:border-primary transition-all sm:py-1.5"
                    data-testid={`input-responsavel-telefone-${idx}`}
                  />
                  {responsaveis.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setResponsaveis(prev => prev.filter(r => r._id !== resp._id))}
                      className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 sm:p-1.5"
                      data-testid={`button-remove-responsavel-${idx}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <Input label="Data de Execução" type="date" value={executionDeadline} onChange={e => setExecutionDeadline(e.target.value)} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Notas de Inspeção</label>
            <textarea
              className="h-20 w-full resize-none rounded-lg border-2 border-border bg-slate-50 px-4 py-3 transition-all focus:border-primary focus:outline-none"
              value={inspectionNotes}
              onChange={e => setInspectionNotes(e.target.value)}
              placeholder="Detalhes da inspeção..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Status</label>
            <select
              className="w-full rounded-lg border-2 border-border bg-slate-50 px-4 py-2.5 font-medium transition-all focus:border-primary focus:outline-none"
              value={status}
              onChange={e => setStatus(e.target.value)}
              data-testid="select-status"
            >
              <option value="Lead">Lead</option>
              <option value="Estimando">Estimando</option>
              <option value="Agendada">Agendada</option>
              <option value="Em Progresso">Em Progresso</option>
              <option value="Concluída">Concluída</option>
              <option value="Faturada">Faturada</option>
            </select>
          </div>

          </div>

          <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-2 border-t bg-white/95 px-1 py-3 backdrop-blur sm:static sm:flex-row sm:justify-end sm:bg-transparent sm:px-0 sm:pt-4">
            <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="w-full sm:w-auto" isLoading={createJob.isPending || updateJob.isPending} data-testid="button-submit-job">
              {editingJob ? "Salvar Alterações" : "Criar Orçamento"}
            </Button>
          </div>
        </QuoteForm>
      </Modal>

      {waModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" data-testid="modal-whatsapp">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <SiWhatsapp className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Enviar via WhatsApp</h2>
                  <p className="text-green-100 text-sm">Para {waModal.clientName} • Status: {waModal.statusName}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {waModal.pdfIncluded && (
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-800 text-sm">PDF gerado e baixado com sucesso!</p>
                    <p className="text-blue-600 text-xs mt-0.5 font-mono">{waModal.pdfFileName}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Mensagem que será enviada:</p>
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">{waModal.message}</p>
                </div>
              </div>

              {/* Attach instruction */}
              {waModal.pdfIncluded && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <span className="text-xl shrink-0">Anexo</span>
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">Como anexar o PDF no WhatsApp:</p>
                    <p className="text-amber-700 text-xs mt-1">
                      Após o WhatsApp abrir, clique no ícone de <strong>clipe / anexo</strong> e selecione o arquivo <strong>{waModal.pdfFileName}</strong> que foi salvo na sua pasta Downloads.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setWaModal(m => ({ ...m, open: false }))}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                data-testid="button-wa-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  window.open(waModal.waUrl, "_blank", "noopener,noreferrer");
                  setWaModal(m => ({ ...m, open: false }));
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/30"
                data-testid="button-wa-open"
              >
                <SiWhatsapp className="w-5 h-5" />
                Abrir WhatsApp agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
