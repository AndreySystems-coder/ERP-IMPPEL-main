// Backfill único e idempotente: cria um lead para cada cliente/orçamento que ainda não tem um,
// para que o Pipeline de CRM (client/src/features/crm-whatsapp/components/CrmPipelineBoard.tsx)
// mostre os contatos reais em vez de aparecer vazio.
//
// Roda contra o banco apontado por DATABASE_URL no momento da execução — confirme com o usuário
// qual banco é antes de rodar (padrão: nunca migrar/alterar produção sem confirmação explícita).
//
// Uso via CLI: npm run backfill:leads
// Também é chamado a partir de um endpoint temporário em produção (ver server/routes.ts,
// POST /api/admin/run-migration-0009) quando não é possível rodar o script localmente
// contra o banco de produção.

import { storage } from "../server/storage";

const DIACRITICS = new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g");

function normalize(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .trim()
    .toLowerCase();
}

function normalizePhone(value: unknown): string {
  return String(value || "").replace(/\D/g, "");
}

export async function runCrmLeadsBackfill() {
  const [clients, jobs, workOrders, leads] = await Promise.all([
    storage.getClients(),
    storage.getJobs(),
    storage.getWorkOrders(),
    storage.getLeads(),
  ]);

  const leadByNameAndPhone = new Map<string, (typeof leads)[number]>();
  for (const lead of leads) {
    leadByNameAndPhone.set(`${normalize(lead.name)}|${normalizePhone(lead.phone)}`, lead);
  }
  const leadByName = new Map<string, (typeof leads)[number]>();
  for (const lead of leads) {
    if (!leadByName.has(normalize(lead.name))) leadByName.set(normalize(lead.name), lead);
  }

  const findOrCreateLead = async (name: string, phone: string, source: string) => {
    const normalizedName = normalize(name);
    if (!normalizedName) return null;
    const normalizedPhone = normalizePhone(phone);
    const byExact = leadByNameAndPhone.get(`${normalizedName}|${normalizedPhone}`);
    if (byExact) return byExact;
    const byName = leadByName.get(normalizedName);
    if (byName) return byName;

    const jobsForLead = jobs.filter(job => normalize(job.clientName) === normalizedName);
    const hasWorkOrder = workOrders.some(order =>
      order.jobId && jobsForLead.some(job => Number(job.id) === Number(order.jobId))
    );
    const status = hasWorkOrder ? "Qualified" : jobsForLead.length > 0 ? "Proposal" : "New Lead";

    const created = await storage.createLead({
      name,
      phone: phone || null,
      source,
      status,
      notes: "Criado pelo backfill do Pipeline (cliente/orçamento já existente no sistema).",
    } as any);
    leadByNameAndPhone.set(`${normalizedName}|${normalizedPhone}`, created);
    leadByName.set(normalizedName, created);
    leads.push(created);
    return created;
  };

  let leadsCreatedForClients = 0;
  for (const client of clients) {
    const existing = leadByName.get(normalize(client.name));
    if (existing) continue;
    await findOrCreateLead(client.name, client.phone || "", "Backfill - Cliente existente");
    leadsCreatedForClients++;
  }

  let jobsLinked = 0;
  for (const job of jobs) {
    if (job.leadId) continue;
    const lead = await findOrCreateLead(job.clientName, "", "Backfill - Orçamento existente");
    if (!lead) continue;
    await storage.updateJob(job.id, { leadId: lead.id } as any);
    jobsLinked++;
  }

  const totalLeads = (await storage.getLeads()).length;
  return { leadsCreatedForClients, jobsLinked, totalLeads };
}

const isDirectRun = process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href;
if (isDirectRun) {
  runCrmLeadsBackfill()
    .then(summary => {
      console.log(`Leads criados a partir de clientes sem lead: ${summary.leadsCreatedForClients}`);
      console.log(`Orçamentos vinculados a um lead (novo ou já existente): ${summary.jobsLinked}`);
      console.log(`Total de leads no banco agora: ${summary.totalLeads}`);
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
