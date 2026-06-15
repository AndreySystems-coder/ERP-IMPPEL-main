import React, { useState } from "react";
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead } from "@/hooks/use-leads";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { Plus, Search, Trash2, Edit2, Phone, Mail, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { asArray } from "@/lib/safeData";

export default function Leads() {
  const { data: leads = [], isLoading } = useLeads();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const leadsList = asArray<any>(leads);

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("New Lead");
  const [notes, setNotes] = useState("");

  const filteredLeads = leadsList.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.status.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditingLead(null);
    setName(""); setPhone(""); setSource(""); setStatus("New Lead"); setNotes("");
    setIsModalOpen(true);
  };

  const openEdit = (lead: any) => {
    setEditingLead(lead);
    setName(lead.name); setPhone(lead.phone || ""); setSource(lead.source || ""); 
    setStatus(lead.status); setNotes(lead.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, phone, source, status, notes };
    if (editingLead) {
      await updateLead.mutateAsync({ id: editingLead.id, ...payload });
    } else {
      await createLead.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const statusColors: Record<string, string> = {
    "New Lead": "bg-blue-100 text-blue-700",
    "Contacted": "bg-amber-100 text-amber-700",
    "Qualified": "bg-emerald-100 text-emerald-700",
    "Proposal": "bg-purple-100 text-purple-700",
    "Lost": "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Leads & CRM</h1>
          <p className="text-slate-500 mt-1">Gerencie seus clientes em potencial e pipeline.</p>
        </div>
        <Button onClick={openNew} className="shrink-0">
          <Plus className="w-5 h-5 mr-2" /> Adicionar Lead
        </Button>
      </div>

      <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm max-w-md focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
        <Search className="w-5 h-5 text-slate-400 mr-3" />
        <input 
          type="text"
          placeholder="Pesquisar leads por nome ou status..."
          className="w-full bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">Nenhum lead encontrado</h3>
          <p className="text-slate-500 mt-2">Tente ajustar sua pesquisa ou adicione um novo lead.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map(lead => (
            <Card key={lead.id} className="flex flex-col group">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold font-display text-slate-900 truncate pr-2">{lead.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${statusColors[lead.status] || "bg-slate-100 text-slate-700"}`}>
                    {lead.status}
                  </span>
                </div>
                
                <div className="space-y-3 mt-4">
                  {lead.phone && (
                    <div className="flex items-center text-sm text-slate-600">
                      <Phone className="w-4 h-4 mr-3 text-slate-400" /> {lead.phone}
                    </div>
                  )}
                  {lead.source && (
                    <div className="flex items-center text-sm text-slate-600">
                      <Mail className="w-4 h-4 mr-3 text-slate-400" /> {lead.source}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-slate-600">
                    <Clock className="w-4 h-4 mr-3 text-slate-400" /> 
                    {lead.createdAt ? format(new Date(lead.createdAt), 'dd/MM/yyyy') : 'Sem data'}
                  </div>
                </div>
                
                {lead.notes && (
                  <p className="mt-4 text-sm text-slate-500 line-clamp-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {lead.notes}
                  </p>
                )}
              </div>
              
              <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex justify-end gap-2 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => openEdit(lead)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if(confirm('Tem certeza que deseja deletar este lead?')) {
                      deleteLead.mutate(lead.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingLead ? "Editar Lead" : "Adicionar Novo Lead"}
      >
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <Input label="Nome Completo *" required value={name} onChange={e => setName(e.target.value)} placeholder="ex. Empresa XYZ" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Telefone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 98765-4321" />
            <Input label="Origem do Lead" value={source} onChange={e => setSource(e.target.value)} placeholder="ex. Website, Indicação" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Status</label>
            <select 
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-border focus:outline-none focus:border-primary transition-all font-medium"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="New Lead">Novo Lead</option>
              <option value="Contacted">Contatado</option>
              <option value="Qualified">Qualificado</option>
              <option value="Proposal">Proposta</option>
              <option value="Lost">Perdido</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Notas</label>
            <textarea 
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-border focus:outline-none focus:border-primary transition-all resize-none h-24"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detalhes sobre este lead..."
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={createLead.isPending || updateLead.isPending}>
              {editingLead ? "Salvar Alterações" : "Criar Lead"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
