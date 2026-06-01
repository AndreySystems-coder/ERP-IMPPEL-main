import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Plus, Edit2, Trash2, MessageSquare, FileText, Upload, CheckCircle, X } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useJobStatuses, useCreateJobStatus, useUpdateJobStatus, useDeleteJobStatus } from "@/hooks/use-job-statuses";
import type { JobStatus } from "@shared/schema";

const PLACEHOLDER_HINT = "Use {cliente} para o primeiro nome do cliente e {numero} para o número do orçamento.";

function StatusForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: Partial<JobStatus>;
  onSave: (data: Partial<JobStatus>) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(initial.name || "");
  const [message, setMessage] = useState(initial.message || "");
  const [includePdf, setIncludePdf] = useState(initial.includePdf !== false);
  const [generateOs, setGenerateOs] = useState(initial.generateOs === true);
  const [extraFileName, setExtraFileName] = useState(initial.extraFileName || "");
  const [extraFileData, setExtraFileData] = useState(initial.extraFileData || "");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setExtraFileData(ev.target?.result as string);
      setExtraFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setExtraFileData("");
    setExtraFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      alert("Preencha o nome e a mensagem.");
      return;
    }
    onSave({
      name: name.trim(),
      message: message.trim(),
      includePdf,
      generateOs,
      extraFileName: extraFileName || undefined,
      extraFileData: extraFileData || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 py-2">
      {/* Nome */}
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nome do Status *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ex: Pendente, Aprovado, Finalizado..."
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          data-testid="input-status-name"
          required
        />
      </div>

      {/* Mensagem */}
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-1.5">
          <SiWhatsapp className="inline w-4 h-4 text-green-500 mr-1" />
          Mensagem WhatsApp *
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          placeholder={`Olá {cliente}! Segue o orçamento Nº {numero}...`}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          data-testid="textarea-status-message"
          required
        />
        <p className="text-xs text-slate-400 mt-1">{PLACEHOLDER_HINT}</p>
      </div>

      {/* Include PDF */}
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <input
          type="checkbox"
          id="include-pdf"
          checked={includePdf}
          onChange={e => setIncludePdf(e.target.checked)}
          className="w-4 h-4 accent-primary"
          data-testid="checkbox-include-pdf"
        />
        <label htmlFor="include-pdf" className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-500" />
          Incluir automaticamente o PDF do Orçamento
        </label>
      </div>

      {/* Generate OS */}
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
        <input
          type="checkbox"
          id="generate-os"
          checked={generateOs}
          onChange={e => setGenerateOs(e.target.checked)}
          className="w-4 h-4 accent-emerald-600"
          data-testid="checkbox-generate-os"
        />
        <label htmlFor="generate-os" className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-1.5">
          <span className="text-emerald-600">⚙️</span>
          Gerar Ordem de Serviço automaticamente ao ativar este status
        </label>
      </div>

      {/* Extra File */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700 block">Arquivo Extra (opcional)</label>
        <p className="text-xs text-slate-400">Será baixado junto com o PDF quando você clicar em "Enviar" no orçamento.</p>
        {extraFileName ? (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-sm text-green-800 font-medium truncate flex-1">{extraFileName}</span>
            <button type="button" onClick={removeFile} className="text-slate-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 transition-colors"
            data-testid="button-upload-extra"
          >
            <Upload className="w-4 h-4" />
            Selecionar arquivo (PDF, imagem, etc.)
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*,.docx,.doc"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-slate-100">
        <Button type="submit" isLoading={isSaving} className="flex-1" data-testid="button-save-status">
          Salvar Status
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export default function StatusPersonalizados() {
  const { data: statuses = [], isLoading } = useJobStatuses();
  const createStatus = useCreateJobStatus();
  const updateStatus = useUpdateJobStatus();
  const deleteStatus = useDeleteJobStatus();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<JobStatus | null>(null);

  const openNew = () => { setEditing(null); setIsModalOpen(true); };
  const openEdit = (s: JobStatus) => { setEditing(s); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditing(null); };

  const handleSave = async (data: Partial<JobStatus>) => {
    if (editing) {
      await updateStatus.mutateAsync({ id: editing.id, ...data });
    } else {
      await createStatus.mutateAsync({ ...data, sortOrder: (statuses.length + 1) });
    }
    closeModal();
  };

  const handleDelete = (id: number) => {
    if (confirm("Excluir este status? Os orçamentos existentes não serão afetados.")) {
      deleteStatus.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Status Personalizados</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie os status dos orçamentos e as mensagens enviadas via WhatsApp.
          </p>
        </div>
        <Button onClick={openNew} data-testid="button-new-status">
          <Plus className="w-4 h-4 mr-2" /> Novo Status
        </Button>
      </div>

      {/* Info card */}
      <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <SiWhatsapp className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
        <div className="text-sm text-green-800 space-y-1">
          <p className="font-semibold">Como funciona a integração</p>
          <p>
            Quando você clica em <strong>Enviar Orçamento</strong> na lista de orçamentos, o sistema encontra o status
            correspondente aqui, usa a mensagem cadastrada (substituindo <code>{"{cliente}"}</code> e <code>{"{numero}"}</code>),
            e abre o WhatsApp Web com o texto pré-preenchido. Se "Incluir PDF" estiver marcado, o PDF é baixado
            automaticamente. Se houver arquivo extra, ele também é baixado para você anexar manualmente.
          </p>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Carregando...</div>
          ) : statuses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum status cadastrado. Clique em "+ Novo Status" para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="p-4 pl-6 text-left font-semibold text-slate-600">Status</th>
                    <th className="p-4 text-left font-semibold text-slate-600">Prévia da Mensagem</th>
                    <th className="p-4 text-center font-semibold text-slate-600">PDF?</th>
                    <th className="p-4 text-center font-semibold text-slate-600">Gerar OS?</th>
                    <th className="p-4 text-left font-semibold text-slate-600">Arquivo Extra</th>
                    <th className="p-4 pr-6 text-right font-semibold text-slate-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statuses.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors" data-testid={`row-status-${s.id}`}>
                      <td className="p-4 pl-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                          {s.name}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="text-slate-600 text-xs line-clamp-2">{s.message}</p>
                      </td>
                      <td className="p-4 text-center">
                        {s.includePdf ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            <FileText className="w-3 h-3" /> Sim
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Não</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {s.generateOs ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            ⚙️ Sim
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Não</span>
                        )}
                      </td>
                      <td className="p-4">
                        {s.extraFileName ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                            <CheckCircle className="w-3 h-3 shrink-0" /> {s.extraFileName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(s)} data-testid={`button-edit-status-${s.id}`}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(s.id)}
                            data-testid={`button-delete-status-${s.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? `Editar Status: ${editing.name}` : "Novo Status Personalizado"}
        size="2xl"
      >
        <StatusForm
          key={editing?.id ?? "new"}
          initial={editing ?? {}}
          onSave={handleSave}
          onCancel={closeModal}
          isSaving={createStatus.isPending || updateStatus.isPending}
        />
      </Modal>
    </div>
  );
}
