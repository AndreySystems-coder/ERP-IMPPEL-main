import React, { useState } from "react";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Plus, Edit2, Trash2, MessageSquare } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import {
  useWorkOrderStatuses,
  useCreateWorkOrderStatus,
  useUpdateWorkOrderStatus,
  useDeleteWorkOrderStatus,
} from "@/hooks/use-work-order-statuses";
import type { WorkOrderStatus } from "@shared/schema";

const PLACEHOLDER_HINT = "Use {cliente} para o primeiro nome do cliente e {os} para o número da ordem de serviço.";

function StatusForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: Partial<WorkOrderStatus>;
  onSave: (data: Partial<WorkOrderStatus>) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(initial.name || "");
  const [color, setColor] = useState(initial.color || "#2563eb");
  const [message, setMessage] = useState(initial.message || "");
  const [autoSendWhatsapp, setAutoSendWhatsapp] = useState(initial.autoSendWhatsapp === true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Preencha o nome do status.");
      return;
    }
    onSave({ name: name.trim(), color, message: message.trim(), autoSendWhatsapp });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 py-2">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nome do Status *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ex: Planejada, Agendada, Concluída..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            data-testid="input-wo-status-name"
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Cor</label>
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-14 h-[42px] border border-slate-200 rounded-xl cursor-pointer"
            data-testid="input-wo-status-color"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-1.5">
          <SiWhatsapp className="inline w-4 h-4 text-green-500 mr-1" />
          Mensagem WhatsApp (opcional)
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          placeholder={`Olá {cliente}! Sua obra #{os} foi atualizada...`}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          data-testid="textarea-wo-status-message"
        />
        <p className="text-xs text-slate-400 mt-1">{PLACEHOLDER_HINT}</p>
      </div>

      <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
        <input
          type="checkbox"
          id="wo-auto-send-whatsapp"
          checked={autoSendWhatsapp}
          onChange={e => setAutoSendWhatsapp(e.target.checked)}
          className="w-4 h-4 accent-green-600"
          data-testid="checkbox-wo-auto-send-whatsapp"
        />
        <label htmlFor="wo-auto-send-whatsapp" className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-1.5">
          <SiWhatsapp className="w-4 h-4 text-green-500" />
          Enviar esta mensagem automaticamente ao entrar neste status (sem precisar clicar em nada)
        </label>
      </div>

      <div className="flex gap-3 pt-2 border-t border-slate-100">
        <Button type="submit" isLoading={isSaving} className="flex-1" data-testid="button-save-wo-status">
          Salvar Status
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export default function StatusObras() {
  const { data: statuses = [], isLoading } = useWorkOrderStatuses();
  const createStatus = useCreateWorkOrderStatus();
  const updateStatus = useUpdateWorkOrderStatus();
  const deleteStatus = useDeleteWorkOrderStatus();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkOrderStatus | null>(null);

  const openNew = () => { setEditing(null); setIsModalOpen(true); };
  const openEdit = (s: WorkOrderStatus) => { setEditing(s); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditing(null); };

  const handleSave = async (data: Partial<WorkOrderStatus>) => {
    if (editing) {
      await updateStatus.mutateAsync({ id: editing.id, ...data });
    } else {
      await createStatus.mutateAsync({ ...data, sortOrder: statuses.length + 1 });
    }
    closeModal();
  };

  const handleDelete = (id: number) => {
    if (confirm("Excluir este status? As ordens de serviço existentes não serão afetadas.")) {
      deleteStatus.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Status de Obras</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie os status das ordens de serviço e as mensagens enviadas via WhatsApp.
          </p>
        </div>
        <Button onClick={openNew} data-testid="button-new-wo-status">
          <Plus className="w-4 h-4 mr-2" /> Novo Status
        </Button>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <SiWhatsapp className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
        <div className="text-sm text-green-800 space-y-1">
          <p className="font-semibold">Como funciona</p>
          <p>
            Marcando <strong>"Enviar automaticamente"</strong>, quando você mudar o status de uma ordem de serviço
            (arrastando no quadro ou editando), a mensagem é disparada sozinha pro cliente. Isso só funciona com a
            automação via n8n configurada e ativada em <strong>Atendimento → CRM e WhatsApp → Automação</strong>.
          </p>
        </div>
      </div>

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
                    <th className="p-4 text-center font-semibold text-slate-600">Auto-envio?</th>
                    <th className="p-4 pr-6 text-right font-semibold text-slate-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statuses.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors" data-testid={`row-wo-status-${s.id}`}>
                      <td className="p-4 pl-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${s.color ? "" : "bg-primary/10 text-primary"}`}
                          style={s.color ? { backgroundColor: `${s.color}1a`, color: s.color } : undefined}
                          data-testid={`badge-wo-status-${s.id}`}
                        >
                          {s.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />}
                          {s.name}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="text-slate-600 text-xs line-clamp-2">{s.message || "—"}</p>
                      </td>
                      <td className="p-4 text-center">
                        {s.autoSendWhatsapp ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            <SiWhatsapp className="w-3 h-3" /> Sim
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Não</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(s)} data-testid={`button-edit-wo-status-${s.id}`}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(s.id)}
                            data-testid={`button-delete-wo-status-${s.id}`}
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

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? `Editar Status: ${editing.name}` : "Novo Status de Obra"}
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
