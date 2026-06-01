import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Upload, CheckCircle, XCircle, Clock, Trash2, Eye, Download } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Contract = {
  id: number;
  jobId?: number;
  workOrderId?: number;
  clientName: string;
  serviceType?: string;
  contractText?: string;
  status: string;
  signedDocumentData?: string;
  signedDocumentName?: string;
  valor?: number;
  createdAt: string;
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  gerado:    { label: "Gerado",    color: "bg-blue-100 text-blue-700 border-blue-200",   icon: Clock },
  assinado:  { label: "Assinado",  color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200",       icon: XCircle },
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");
const fmtBRL  = (v?: number) => v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
const today   = () => new Date().toLocaleDateString("pt-BR");

function generateContractText(clientName: string, serviceType: string, valor?: number): string {
  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE IMPERMEABILIZAÇÃO

CONTRATANTE: ${clientName}
CONTRATADA: IMPPEL Impermeabilização e Reformas

Data: ${today()}

OBJETO DO CONTRATO
A CONTRATADA se compromete a executar os seguintes serviços: ${serviceType || "[Descreva o serviço]"}.

VALOR E PAGAMENTO
Valor total acordado: ${valor ? fmtBRL(valor) : "[A definir]"}.
O pagamento será realizado conforme condições acordadas no orçamento aprovado.

PRAZO DE EXECUÇÃO
O prazo de execução será conforme cronograma apresentado no orçamento.

GARANTIA
Os serviços executados contarão com garantia de acordo com o tipo de serviço realizado, conforme especificado no Certificado de Garantia emitido ao final da obra.

RESPONSABILIDADES DA CONTRATADA
• Executar os serviços com mão de obra qualificada e materiais de primeira qualidade;
• Seguir as normas técnicas ABNT aplicáveis;
• Zelar pela segurança no canteiro de obras;
• Manter o local de trabalho limpo e organizado;
• Emitir Certificado de Garantia ao final dos serviços.

RESPONSABILIDADES DO CONTRATANTE
• Garantir acesso ao local de execução dos serviços;
• Efetuar os pagamentos nos prazos acordados;
• Comunicar imediatamente qualquer problema detectado.

RESCISÃO
Este contrato poderá ser rescindido por qualquer das partes mediante notificação com 7 (sete) dias de antecedência, ficando pendente o pagamento proporcional pelos serviços já executados.

FORO
Fica eleito o foro da comarca local para dirimir quaisquer controvérsias oriundas deste contrato.

___________________________          ___________________________
CONTRATANTE                           CONTRATADA
${clientName}                          IMPPEL Impermeabilização`;
}

export default function Contracts() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: contracts = [], isLoading } = useQuery<Contract[]>({ queryKey: ["/api/contracts"] });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen]   = useState(false);
  const [viewing, setViewing]         = useState<Contract | null>(null);
  const [editing, setEditing]         = useState<Contract | null>(null);

  const [clientName, setClientName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [valor, setValor] = useState("");
  const [contractText, setContractText] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/contracts"] });

  const create = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/contracts", d),
    onSuccess: () => { invalidate(); toast({ title: "Contrato gerado!" }); closeModal(); },
    onError: (e: any) => toast({ title: `Erro: ${e.message}`, variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: ({ id, ...d }: any) => apiRequest("PUT", `/api/contracts/${id}`, d),
    onSuccess: () => { invalidate(); toast({ title: "Atualizado!" }); closeModal(); },
    onError: (e: any) => toast({ title: `Erro: ${e.message}`, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/contracts/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Removido." }); },
  });

  const openNew = () => {
    setEditing(null);
    setClientName(""); setServiceType(""); setValor(""); setContractText("");
    setIsModalOpen(true);
  };
  const openEdit = (c: Contract) => {
    setEditing(c);
    setClientName(c.clientName); setServiceType(c.serviceType || "");
    setValor(c.valor ? String(c.valor) : ""); setContractText(c.contractText || "");
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditing(null); };

  const handleGenerate = () => {
    const txt = generateContractText(clientName, serviceType, valor ? Number(valor) : undefined);
    setContractText(txt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { clientName, serviceType, contractText, valor: valor ? Number(valor) : null, status: "gerado" };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  };

  const handleUploadSigned = (contractId: number, file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const data = ev.target?.result as string;
      await apiRequest("PUT", `/api/contracts/${contractId}`, { signedDocumentData: data, signedDocumentName: file.name, status: "assinado" });
      invalidate();
      toast({ title: "Documento assinado enviado!" });
    };
    reader.readAsDataURL(file);
  };

  const handleChangeStatus = (c: Contract, status: string) => {
    update.mutate({ id: c.id, status });
  };

  const handleDownloadText = (c: Contract) => {
    if (!c.contractText) return;
    const blob = new Blob([c.contractText], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Contrato_${c.clientName.replace(/\s+/g, "_")}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = (contracts as Contract[]).filter(c => statusFilter === "todos" || c.status === statusFilter);

  const counts = {
    total:     (contracts as Contract[]).length,
    gerado:    (contracts as Contract[]).filter(c => c.status === "gerado").length,
    assinado:  (contracts as Contract[]).filter(c => c.status === "assinado").length,
    cancelado: (contracts as Contract[]).filter(c => c.status === "cancelado").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Contratos e Documentos
          </h1>
          <p className="text-slate-500 mt-1">Geração, armazenamento e controle de contratos de serviço.</p>
        </div>
        <Button onClick={openNew} data-testid="button-new-contract">
          <Plus className="w-4 h-4 mr-2" /> Novo Contrato
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.total, color: "text-slate-700", bg: "bg-slate-100" },
          { label: "Gerados", value: counts.gerado, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Assinados", value: counts.assinado, color: "text-green-700", bg: "bg-green-50" },
          { label: "Cancelados", value: counts.cancelado, color: "text-red-700", bg: "bg-red-50" },
        ].map(k => (
          <Card key={k.label} className={`${k.bg} border-0 p-4 text-center`}>
            <p className="text-2xl font-bold">{k.value}</p>
            <p className={`text-sm font-medium ${k.color}`}>{k.label}</p>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["todos","gerado","assinado","cancelado"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors capitalize ${statusFilter === s ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-primary"}`}>
            {s === "todos" ? "Todos" : STATUS_MAP[s]?.label}
          </button>
        ))}
      </div>

      {/* List */}
      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum contrato encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(c => {
              const st = STATUS_MAP[c.status] || STATUS_MAP.gerado;
              return (
                <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors" data-testid={`row-contract-${c.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-slate-800">{c.clientName}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${st.color}`}>
                        <st.icon className="w-3 h-3" />
                        {st.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{c.serviceType || "—"} {c.valor ? `· ${fmtBRL(c.valor)}` : ""} · {fmtDate(c.createdAt)}</p>
                    {c.signedDocumentName && <p className="text-xs text-green-600 mt-0.5">📎 {c.signedDocumentName}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    {c.contractText && (
                      <button onClick={() => { setViewing(c); setIsViewOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg" title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {c.contractText && (
                      <button onClick={() => handleDownloadText(c)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg" title="Baixar texto">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    {c.status !== "assinado" && (
                      <label className="cursor-pointer px-2 py-1 text-xs rounded-lg border border-green-200 text-green-700 hover:bg-green-50 font-medium" title="Enviar documento assinado">
                        <Upload className="w-3 h-3 inline mr-1" />Assinar
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                          onChange={e => e.target.files?.[0] && handleUploadSigned(c.id, e.target.files[0])} />
                      </label>
                    )}
                    {c.status !== "cancelado" && (
                      <button onClick={() => handleChangeStatus(c, c.status === "cancelado" ? "gerado" : "cancelado")}
                        className="px-2 py-1 text-xs rounded-lg border border-red-200 text-red-700 hover:bg-red-50 font-medium">
                        Cancelar
                      </button>
                    )}
                    <button onClick={() => openEdit(c)}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">
                      Editar
                    </button>
                    <button onClick={() => !confirm(`Excluir contrato de "${c.clientName}"?`) || remove.mutate(c.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`Contrato — ${viewing?.clientName}`}>
        <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-[60vh] overflow-y-auto font-mono leading-relaxed">
          {viewing?.contractText}
        </pre>
        <div className="flex gap-3 pt-3">
          <Button variant="ghost" className="flex-1" onClick={() => setIsViewOpen(false)}>Fechar</Button>
          {viewing && <Button className="flex-1" onClick={() => handleDownloadText(viewing)}><Download className="w-4 h-4 mr-2" />Baixar</Button>}
        </div>
      </Modal>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editing ? "Editar Contrato" : "Novo Contrato"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nome do Cliente *</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} required
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="Nome do cliente" data-testid="input-contract-client" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tipo de Serviço</label>
              <input value={serviceType} onChange={e => setServiceType(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="Ex: Manta Asfáltica" data-testid="input-contract-service" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Valor (R$)</label>
              <input type="number" value={valor} onChange={e => setValor(e.target.value)} min={0}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-slate-50"
                placeholder="0,00" data-testid="input-contract-valor" />
            </div>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={handleGenerate}>
            <FileText className="w-4 h-4 mr-2" /> Gerar Texto Padrão do Contrato
          </Button>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Texto do Contrato</label>
            <textarea value={contractText} onChange={e => setContractText(e.target.value)} rows={10}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary bg-slate-50 font-mono resize-none"
              placeholder="Clique em 'Gerar Texto Padrão' ou escreva o contrato..." data-testid="input-contract-text" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" isLoading={create.isPending || update.isPending} className="flex-1" data-testid="button-save-contract">
              {editing ? "Salvar" : "Gerar Contrato"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
