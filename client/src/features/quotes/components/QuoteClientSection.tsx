import { Briefcase, Plus, X } from "lucide-react";

export interface QuoteClientForm {
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

interface QuoteClientSectionProps {
  clients: any[];
  clientId: string;
  quoteClients: QuoteClientForm[];
  onClientIdChange: (value: string) => void;
  onQuoteClientsChange: (updater: (current: QuoteClientForm[]) => QuoteClientForm[]) => void;
  createClient: () => QuoteClientForm;
}

export function QuoteClientSection({
  clients,
  clientId,
  quoteClients,
  onClientIdChange,
  onQuoteClientsChange,
  createClient,
}: QuoteClientSectionProps) {
  const updateClient = (id: string, patch: Partial<QuoteClientForm>) => {
    onQuoteClientsChange((current) => current.map((client) => (client._id === id ? { ...client, ...patch } : client)));
  };

  return (
    <section id="quote-clientes" className="scroll-mt-28 space-y-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Briefcase className="h-4 w-4 text-primary" /> Clientes / Partes Envolvidas
        </label>
        <button
          type="button"
          onClick={() => onQuoteClientsChange((current) => [...current, createClient()])}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 sm:h-auto sm:py-2"
          data-testid="button-add-cliente"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar cliente
        </button>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500">Preencher do cadastro de clientes (opcional)</label>
        <select
          value={clientId}
          onChange={(event) => {
            const selected = clients.find((client) => String(client.id) === event.target.value);
            onClientIdChange(event.target.value);
            if (!selected) return;

            onQuoteClientsChange((current) => {
              const updated = [...current];
              const firstEmpty = updated.findIndex((client) => !client.nome.trim());
              const entry: QuoteClientForm = {
                _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                nome: selected.name,
                cargo: "Proprietário",
                telefone: selected.phone || "",
                rua: selected.address || "",
                numero: "",
                bairro: "",
                cidade: selected.city || "",
                estado: selected.state || "SP",
                cep: "",
                endereco: selected.address || "",
              };
              if (firstEmpty >= 0) {
                updated[firstEmpty] = entry;
                return updated;
              }
              return [...updated, entry];
            });
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-all focus:border-primary focus:outline-none sm:py-2"
          data-testid="select-client-job"
        >
          <option value="">Selecionar do cadastro...</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {quoteClients.map((client, index) => (
          <div key={client._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_160px_150px_36px]">
              <input
                type="text"
                value={client.nome}
                onChange={(event) => updateClient(client._id, { nome: event.target.value })}
                placeholder="Nome completo *"
                className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium transition-all focus:border-primary focus:outline-none"
                data-testid={`input-cliente-nome-${index}`}
              />
              <select
                value={client.cargo}
                onChange={(event) => updateClient(client._id, { cargo: event.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none"
                data-testid={`select-cliente-cargo-${index}`}
              >
                <option value="Proprietário">Proprietário</option>
                <option value="Contratante">Contratante</option>
                <option value="Engenheiro">Engenheiro</option>
                <option value="Responsável Técnico">Resp. Técnico</option>
                <option value="Inquilino">Inquilino</option>
                <option value="Outro">Outro</option>
              </select>
              <input
                type="text"
                value={client.telefone}
                onChange={(event) => updateClient(client._id, { telefone: event.target.value })}
                placeholder="Telefone"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none"
                data-testid={`input-cliente-telefone-${index}`}
              />
              {quoteClients.length > 1 && (
                <button
                  type="button"
                  onClick={() => onQuoteClientsChange((current) => current.filter((item) => item._id !== client._id))}
                  className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  data-testid={`button-remove-cliente-${index}`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_80px_minmax(120px,160px)]">
              <input value={client.rua} onChange={(event) => updateClient(client._id, { rua: event.target.value })} placeholder="Rua / Avenida" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" data-testid={`input-cliente-rua-${index}`} />
              <input value={client.numero} onChange={(event) => updateClient(client._id, { numero: event.target.value })} placeholder="Nº" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" data-testid={`input-cliente-numero-${index}`} />
              <input value={client.bairro} onChange={(event) => updateClient(client._id, { bairro: event.target.value })} placeholder="Bairro" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" data-testid={`input-cliente-bairro-${index}`} />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_70px_130px]">
              <input value={client.cidade} onChange={(event) => updateClient(client._id, { cidade: event.target.value })} placeholder="Cidade" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" data-testid={`input-cliente-cidade-${index}`} />
              <input value={client.estado} onChange={(event) => updateClient(client._id, { estado: event.target.value })} placeholder="UF" maxLength={2} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none" data-testid={`input-cliente-estado-${index}`} />
              <input value={client.cep} onChange={(event) => updateClient(client._id, { cep: event.target.value })} placeholder="CEP" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" data-testid={`input-cliente-cep-${index}`} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
