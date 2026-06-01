import React, { useState } from "react";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/use-clients";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { Plus, Search, Trash2, Edit2, Users, Phone, Mail } from "lucide-react";
import { WhatsAppButton, WhatsAppTemplates } from "@/components/WhatsAppButton";
import BackupManager from "@/components/BackupManager";
import { useUser } from "@/hooks/use-auth";

export default function Clients() {
  const { data: currentUser } = useUser();
  const isAdmin = currentUser?.role === "admin";
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [notes, setNotes] = useState("");

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditingClient(null);
    setName(""); setPhone(""); setEmail(""); setCpfCnpj(""); 
    setAddress(""); setCity(""); setState(""); setNotes("");
    setIsModalOpen(true);
  };

  const openEdit = (client: any) => {
    setEditingClient(client);
    setName(client.name); setPhone(client.phone || ""); setEmail(client.email || "");
    setCpfCnpj(client.cpfCnpj || ""); setAddress(client.address || "");
    setCity(client.city || ""); setState(client.state || ""); setNotes(client.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, phone, email, cpfCnpj, address, city, state, notes };
    if (editingClient) {
      await updateClient.mutateAsync({ id: editingClient.id, ...payload });
    } else {
      await createClient.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja deletar este cliente?")) {
      await deleteClient.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Clientes
          </h1>
          <p className="text-slate-500 mt-1">Gerencie clientes e entre em contato via WhatsApp.</p>
        </div>
        <div className="flex items-center gap-2">
          <BackupManager type="clientes" isAdmin={isAdmin} />
          <Button onClick={openNew} data-testid="button-new-client">
            <Plus className="w-5 h-5 mr-2" /> Novo Cliente
          </Button>
        </div>
      </div>

      <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm max-w-md focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
        <Search className="w-5 h-5 text-slate-400 mr-3" />
        <input 
          type="text"
          placeholder="Pesquisar por nome, telefone ou email..."
          className="w-full bg-transparent border-none focus:outline-none text-slate-900 placeholder-slate-400"
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="input-search-clients"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b">
                <th className="p-4 pl-6">Nome</th>
                <th className="p-4">Telefone</th>
                <th className="p-4">Email</th>
                <th className="p-4">Cidade</th>
                <th className="p-4 text-right pr-6">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.length === 0 && !isLoading && (
                <tr><td colSpan={5} className="text-center p-12 text-slate-400"><Users className="w-12 h-12 mx-auto mb-3 opacity-50"/>Nenhum cliente cadastrado</td></tr>
              )}
              {filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors" data-testid={`row-client-${client.id}`}>
                  <td className="p-4 pl-6 font-bold text-slate-900">{client.name}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {client.phone && <Phone className="w-4 h-4 text-slate-400" />}
                      {client.phone || "-"}
                    </div>
                  </td>
                  <td className="p-4 text-blue-600">{client.email || "-"}</td>
                  <td className="p-4 text-slate-600">{client.city || "-"}</td>
                  <td className="p-4 text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      {client.phone && (
                        <div className="relative group">
                          <WhatsAppButton phone={client.phone} clientName={client.name} />
                          <div className="hidden group-hover:block absolute right-0 top-10 bg-slate-800 text-white text-xs rounded p-2 w-48 z-50">
                            <div className="space-y-1">
                              <a href={`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(WhatsAppTemplates.inspection(client.name))}`} target="_blank" rel="noopener noreferrer" className="block hover:text-blue-300">
                                📋 Inspeção
                              </a>
                              <a href={`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(WhatsAppTemplates.quote(client.name))}`} target="_blank" rel="noopener noreferrer" className="block hover:text-blue-300">
                                💰 Orçamento
                              </a>
                              <a href={`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(WhatsAppTemplates.followup(client.name))}`} target="_blank" rel="noopener noreferrer" className="block hover:text-blue-300">
                                📞 Acompanhamento
                              </a>
                              <a href={`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(WhatsAppTemplates.completed(client.name))}`} target="_blank" rel="noopener noreferrer" className="block hover:text-blue-300">
                                ✅ Obra Concluída
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(client)} data-testid={`button-edit-client-${client.id}`}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(client.id)} data-testid={`button-delete-client-${client.id}`}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingClient ? "Editar Cliente" : "Novo Cliente"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Input label="Nome Completo *" required value={name} onChange={e => setName(e.target.value)} placeholder="Ex. João Silva" data-testid="input-client-name" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Telefone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" data-testid="input-client-phone" />
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@email.com" data-testid="input-client-email" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="CPF/CNPJ" value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="000.000.000-00 ou 00.000.000/0000-00" data-testid="input-client-cpf" />
            <Input label="UF" value={state} onChange={e => setState(e.target.value)} placeholder="SP" data-testid="input-client-state" maxLength={2} />
          </div>

          <Input label="Cidade" value={city} onChange={e => setCity(e.target.value)} placeholder="São Paulo" data-testid="input-client-city" />
          <Input label="Endereço" value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua/Avenida, número..." data-testid="input-client-address" />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Notas</label>
            <textarea 
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-border focus:outline-none focus:border-primary transition-all resize-none h-16"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observações, preferências de contato..."
              data-testid="input-client-notes"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={createClient.isPending || updateClient.isPending} data-testid="button-submit-client">
              {editingClient ? "Salvar Alterações" : "Criar Cliente"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
