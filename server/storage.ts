import { db, pool } from "./db";
import {
  users, clients, services, leads, jobs, workOrders, inventory, inventoryMovements, payments, products, materialSales, jobTracking, priorityRules, transactions, settings, costConfig, obraRegistros, jobStatuses, paymentMethods, paymentConditions, obraConsumoLogs,
  contracts, warranties, warrantyIncidents, productionLogs, npsResponses, maintenanceReminders,
  whatsappFlows, whatsappSendLogs, whatsappTemplates, quoteTemplates,
  materialWithdrawals, materialWithdrawalItems, mobileImportAliases, mobileImportHistory,
  salaryDiscountRules, salaryDiscounts,
  roles,
  type Role, type InsertRole,
  type User, type Client, type Service, type Lead, type Job, type WorkOrder, type Inventory, type InventoryMovement, type Payment, type Product, type JobTracking, type PriorityRules, type Transaction, type Setting, type CostConfig, type InsertCostConfig, type ObraRegistro, type InsertObraRegistro,
  type InsertUser, type InsertClient, type InsertService, type InsertLead, type InsertJob, type InsertWorkOrder, type InsertInventory, type InsertInventoryMovement, type InsertPayment, type InsertProduct, type InsertJobTracking, type InsertPriorityRules, type InsertTransaction, type InsertSetting,
  type JobStatus, type InsertJobStatus,
  type PaymentMethod, type InsertPaymentMethod,
  type PaymentCondition, type InsertPaymentCondition,
  type ObraConsumoLog, type InsertObraConsumoLog,
  type Contract, type InsertContract,
  type Warranty, type InsertWarranty,
  type WarrantyIncident, type InsertWarrantyIncident,
  type ProductionLog, type InsertProductionLog,
  type NpsResponse, type InsertNpsResponse,
  type MaintenanceReminder, type InsertMaintenanceReminder,
  type WhatsappFlow, type InsertWhatsappFlow,
  type WhatsappSendLog, type InsertWhatsappSendLog,
  type WhatsappTemplate, type InsertWhatsappTemplate,
  type QuoteTemplate, type InsertQuoteTemplate,
  type MaterialWithdrawal, type MaterialWithdrawalItem,
  type InsertMaterialWithdrawal, type InsertMaterialWithdrawalItem,
  type MobileImportAlias, type InsertMobileImportAlias,
  type MobileImportHistory, type InsertMobileImportHistory,
  type SalaryDiscountRule, type SalaryDiscount,
  type InsertSalaryDiscountRule, type InsertSalaryDiscount,
  type MaterialSale, type InsertMaterialSale,
} from "@shared/schema";
import { eq, desc, sql, getTableColumns, and } from "drizzle-orm";

export const COMPLETE_BACKUP_MODULE_TABLES = {
  usuarios: ["roles", "users"],
  clientes: ["clients"],
  leads: ["leads"],
  orcamentos: ["jobs"],
  ordensServico: ["workOrders", "jobTracking"],
  registrosObra: ["obraRegistros", "productionLogs"],
  controleMateriais: ["materialWithdrawals", "materialWithdrawalItems", "obraConsumoLogs", "salaryDiscounts"],
  importacoesRapidas: ["mobileImportAliases", "mobileImportHistory"],
  estoque: ["inventory", "inventoryMovements"],
  catalogoMateriais: ["products"],
  vendasMateriais: ["materialSales"],
  catalogoServicos: ["services"],
  financeiro: ["payments", "transactions"],
  garantias: ["warranties", "warrantyIncidents", "contracts"],
  posVenda: ["npsResponses", "maintenanceReminders"],
  configuracoes: ["settings", "costConfig", "priorityRules", "jobStatuses", "whatsappFlows", "whatsappSendLogs", "whatsappTemplates", "quoteTemplates", "salaryDiscountRules"],
  formasPagamento: ["paymentMethods"],
  condicoesPagamento: ["paymentConditions"],
} as const;

export type CompleteBackupModule = keyof typeof COMPLETE_BACKUP_MODULE_TABLES;
export type CompleteBackupData = Record<string, any[]>;
export type CompleteRestoreMode = "merge" | "replace";

const COMPLETE_TABLES: Record<string, { table: any; dbName: string }> = {
  roles: { table: roles, dbName: "roles" },
  users: { table: users, dbName: "users" },
  clients: { table: clients, dbName: "clients" },
  services: { table: services, dbName: "services" },
  leads: { table: leads, dbName: "leads" },
  jobs: { table: jobs, dbName: "jobs" },
  workOrders: { table: workOrders, dbName: "work_orders" },
  inventory: { table: inventory, dbName: "inventory" },
  inventoryMovements: { table: inventoryMovements, dbName: "inventory_movements" },
  payments: { table: payments, dbName: "payments" },
  products: { table: products, dbName: "products" },
  materialSales: { table: materialSales, dbName: "material_sales" },
  jobTracking: { table: jobTracking, dbName: "job_tracking" },
  priorityRules: { table: priorityRules, dbName: "priority_rules" },
  transactions: { table: transactions, dbName: "transactions" },
  settings: { table: settings, dbName: "settings" },
  costConfig: { table: costConfig, dbName: "cost_config" },
  obraRegistros: { table: obraRegistros, dbName: "obra_registros" },
  jobStatuses: { table: jobStatuses, dbName: "job_statuses" },
  paymentMethods: { table: paymentMethods, dbName: "payment_methods" },
  paymentConditions: { table: paymentConditions, dbName: "payment_conditions" },
  obraConsumoLogs: { table: obraConsumoLogs, dbName: "obra_consumo_logs" },
  contracts: { table: contracts, dbName: "contracts" },
  warranties: { table: warranties, dbName: "warranties" },
  warrantyIncidents: { table: warrantyIncidents, dbName: "warranty_incidents" },
  productionLogs: { table: productionLogs, dbName: "production_logs" },
  npsResponses: { table: npsResponses, dbName: "nps_responses" },
  maintenanceReminders: { table: maintenanceReminders, dbName: "maintenance_reminders" },
  whatsappFlows: { table: whatsappFlows, dbName: "whatsapp_flows" },
  whatsappSendLogs: { table: whatsappSendLogs, dbName: "whatsapp_send_logs" },
  whatsappTemplates: { table: whatsappTemplates, dbName: "whatsapp_templates" },
  quoteTemplates: { table: quoteTemplates, dbName: "quote_templates" },
  materialWithdrawals: { table: materialWithdrawals, dbName: "material_withdrawals" },
  materialWithdrawalItems: { table: materialWithdrawalItems, dbName: "material_withdrawal_items" },
  mobileImportAliases: { table: mobileImportAliases, dbName: "mobile_import_aliases" },
  mobileImportHistory: { table: mobileImportHistory, dbName: "mobile_import_history" },
  salaryDiscountRules: { table: salaryDiscountRules, dbName: "salary_discount_rules" },
  salaryDiscounts: { table: salaryDiscounts, dbName: "salary_discounts" },
};

function selectedCompleteTables(modules: CompleteBackupModule[]) {
  return Array.from(new Set(modules.flatMap(moduleName => [...COMPLETE_BACKUP_MODULE_TABLES[moduleName]])));
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export interface IStorage {
  getCompleteBackupData(): Promise<CompleteBackupData>;
  restoreCompleteBackup(data: CompleteBackupData, modules: CompleteBackupModule[], mode: CompleteRestoreMode): Promise<{ tables: Record<string, number>; total: number }>;
  // Auth / Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  updateUserPassword(id: number, password: string): Promise<User | undefined>;
  updateUserRoleId(id: number, roleId: number | null): Promise<User | undefined>;
  updateUserJobTitle(id: number, jobTitle: string): Promise<User | undefined>;

  // Roles
  getRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  createRole(data: InsertRole): Promise<Role>;
  updateRole(id: number, data: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: number): Promise<void>;
  deleteUser(id: number): Promise<void>;
  clearOperationalData(): Promise<{ deleted: number; preservedUsers: number; preservedRoles: number }>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<void>;

  // Services
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, updates: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<void>;

  // Leads
  getLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<void>;

  // Jobs
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, updates: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: number): Promise<void>;

  // Work Orders
  getWorkOrders(): Promise<WorkOrder[]>;
  getWorkOrder(id: number): Promise<WorkOrder | undefined>;
  createWorkOrder(order: InsertWorkOrder): Promise<WorkOrder>;
  updateWorkOrder(id: number, updates: Partial<InsertWorkOrder>): Promise<WorkOrder | undefined>;
  deleteWorkOrder(id: number): Promise<void>;

  // Inventory
  getInventoryItems(): Promise<Inventory[]>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, updates: Partial<InsertInventory>): Promise<Inventory | undefined>;
  deleteInventoryItem(id: number): Promise<void>;
  // Inventory Movements
  getInventoryMovements(): Promise<InventoryMovement[]>;
  getInventoryMovementsByProduct(inventoryId: number): Promise<InventoryMovement[]>;
  getInventoryMovement(id: number): Promise<InventoryMovement | undefined>;
  createInventoryMovement(data: { inventoryId: number; productName: string; type: string; quantity: number; date: string; month?: string; notes?: string }, options?: { applyToStock?: boolean }): Promise<InventoryMovement>;
  updateInventoryMovement(id: number, data: { inventoryId: number; productName: string; type: string; quantity: number; date: string; month?: string; notes?: string }): Promise<InventoryMovement | undefined>;
  deleteInventoryMovement(id: number): Promise<void>;

  // Payments
  getPayments(): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByJobId(jobId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, updates: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<void>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;

  // Material sales
  getMaterialSales(): Promise<MaterialSale[]>;
  getMaterialSale(id: number): Promise<MaterialSale | undefined>;
  createMaterialSale(sale: InsertMaterialSale): Promise<MaterialSale>;
  updateMaterialSale(id: number, updates: Partial<InsertMaterialSale>): Promise<MaterialSale | undefined>;
  approveMaterialSale(id: number, approver: { id: number; username: string }): Promise<MaterialSale | undefined>;

  // Job Tracking
  getJobTracking(workOrderId: number): Promise<JobTracking | undefined>;
  createJobTracking(tracking: InsertJobTracking): Promise<JobTracking>;
  updateJobTracking(id: number, updates: Partial<InsertJobTracking>): Promise<JobTracking | undefined>;

  // Priority Rules
  getPriorityRules(): Promise<PriorityRules | undefined>;
  updatePriorityRules(rules: Partial<InsertPriorityRules>): Promise<PriorityRules>;

  // Transactions
  getTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;

  // Settings
  getSettings(): Promise<Setting[]>;
  updateSetting(key: string, value: number): Promise<Setting>;

  // Cost Config
  getCostConfig(): Promise<CostConfig | undefined>;
  updateCostConfig(config: Partial<InsertCostConfig>): Promise<CostConfig>;

  // Obra Registros
  getObraRegistros(): Promise<ObraRegistro[]>;
  getObraRegistro(id: number): Promise<ObraRegistro | undefined>;
  getObraRegistrosByTipo(tipo: string): Promise<ObraRegistro[]>;
  createObraRegistro(data: InsertObraRegistro): Promise<ObraRegistro>;
  updateObraRegistro(id: number, data: Partial<InsertObraRegistro>): Promise<ObraRegistro | undefined>;
  deleteObraRegistro(id: number): Promise<void>;

  // Job Statuses (custom WhatsApp messages per status)
  getJobStatuses(): Promise<JobStatus[]>;
  getJobStatus(id: number): Promise<JobStatus | undefined>;
  createJobStatus(data: InsertJobStatus): Promise<JobStatus>;
  updateJobStatus(id: number, data: Partial<InsertJobStatus>): Promise<JobStatus | undefined>;
  deleteJobStatus(id: number): Promise<void>;

  // Payment Methods (Formas de Pagamento)
  getPaymentMethods(): Promise<PaymentMethod[]>;
  getPaymentMethod(id: number): Promise<PaymentMethod | undefined>;
  createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: number, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: number): Promise<void>;

  // Payment Conditions (Condições de Pagamento — multi-select for PDF)
  getPaymentConditions(): Promise<PaymentCondition[]>;
  getPaymentCondition(id: number): Promise<PaymentCondition | undefined>;
  createPaymentCondition(data: InsertPaymentCondition): Promise<PaymentCondition>;
  updatePaymentCondition(id: number, data: Partial<InsertPaymentCondition>): Promise<PaymentCondition | undefined>;
  deletePaymentCondition(id: number): Promise<void>;

  // Obra Consumo Logs — per-user material consumption tracking
  getObraConsumoLogs(workOrderId: number): Promise<ObraConsumoLog[]>;
  getObraConsumoLog(id: number): Promise<ObraConsumoLog | undefined>;
  createObraConsumoLog(data: InsertObraConsumoLog): Promise<ObraConsumoLog>;
  deleteObraConsumoLog(id: number): Promise<void>;

  // WhatsApp Flows & Logs
  getWhatsappFlows(): Promise<WhatsappFlow[]>;
  createWhatsappFlow(data: InsertWhatsappFlow): Promise<WhatsappFlow>;
  updateWhatsappFlow(id: number, data: Partial<InsertWhatsappFlow>): Promise<WhatsappFlow | undefined>;
  deleteWhatsappFlow(id: number): Promise<void>;
  getWhatsappSendLogs(limit?: number): Promise<WhatsappSendLog[]>;
  createWhatsappSendLog(data: InsertWhatsappSendLog): Promise<WhatsappSendLog>;
  // WhatsApp Templates
  getWhatsappTemplates(): Promise<WhatsappTemplate[]>;
  getWhatsappTemplatesByCategory(category: string): Promise<WhatsappTemplate[]>;
  createWhatsappTemplate(data: InsertWhatsappTemplate): Promise<WhatsappTemplate>;
  updateWhatsappTemplate(id: number, data: Partial<InsertWhatsappTemplate>): Promise<WhatsappTemplate | undefined>;
  deleteWhatsappTemplate(id: number): Promise<void>;

  // Quote PDF Templates
  getQuoteTemplates(): Promise<QuoteTemplate[]>;
  getQuoteTemplate(id: number): Promise<QuoteTemplate | undefined>;
  getDefaultQuoteTemplate(): Promise<QuoteTemplate | undefined>;
  createQuoteTemplate(data: InsertQuoteTemplate): Promise<QuoteTemplate>;
  updateQuoteTemplate(id: number, data: Partial<InsertQuoteTemplate>): Promise<QuoteTemplate | undefined>;
  setDefaultQuoteTemplate(id: number): Promise<void>;
  deleteQuoteTemplate(id: number): Promise<void>;

  // Contracts
  getContracts(): Promise<Contract[]>;
  getContract(id: number): Promise<Contract | undefined>;
  createContract(data: InsertContract): Promise<Contract>;
  updateContract(id: number, data: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: number): Promise<void>;

  // Warranties
  getWarranties(): Promise<Warranty[]>;
  getWarranty(id: number): Promise<Warranty | undefined>;
  createWarranty(data: InsertWarranty): Promise<Warranty>;
  updateWarranty(id: number, data: Partial<InsertWarranty>): Promise<Warranty | undefined>;
  deleteWarranty(id: number): Promise<void>;

  // Warranty Incidents
  getWarrantyIncidents(warrantyId: number): Promise<WarrantyIncident[]>;
  createWarrantyIncident(data: InsertWarrantyIncident): Promise<WarrantyIncident>;
  updateWarrantyIncident(id: number, data: Partial<InsertWarrantyIncident>): Promise<WarrantyIncident | undefined>;
  deleteWarrantyIncident(id: number): Promise<void>;

  // Production Logs
  getProductionLogs(): Promise<ProductionLog[]>;
  createProductionLog(data: InsertProductionLog): Promise<ProductionLog>;
  updateProductionLog(id: number, data: Partial<InsertProductionLog>): Promise<ProductionLog | undefined>;
  deleteProductionLog(id: number): Promise<void>;

  // NPS Responses
  getNpsResponses(): Promise<NpsResponse[]>;
  createNpsResponse(data: InsertNpsResponse): Promise<NpsResponse>;
  updateNpsResponse(id: number, data: Partial<InsertNpsResponse>): Promise<NpsResponse | undefined>;
  deleteNpsResponse(id: number): Promise<void>;

  // Maintenance Reminders
  getMaintenanceReminders(): Promise<MaintenanceReminder[]>;
  createMaintenanceReminder(data: InsertMaintenanceReminder): Promise<MaintenanceReminder>;
  updateMaintenanceReminder(id: number, data: Partial<InsertMaintenanceReminder>): Promise<MaintenanceReminder | undefined>;
  deleteMaintenanceReminder(id: number): Promise<void>;

  // Material Withdrawals
  getMaterialWithdrawals(): Promise<(MaterialWithdrawal & { items: MaterialWithdrawalItem[] })[]>;
  getMaterialWithdrawal(id: number): Promise<(MaterialWithdrawal & { items: MaterialWithdrawalItem[] }) | undefined>;
  createMaterialWithdrawal(data: InsertMaterialWithdrawal, items: InsertMaterialWithdrawalItem[]): Promise<MaterialWithdrawal & { items: MaterialWithdrawalItem[] }>;
  updateMaterialWithdrawal(id: number, data: Partial<InsertMaterialWithdrawal>): Promise<MaterialWithdrawal | undefined>;
  updateMaterialWithdrawalItems(withdrawalId: number, items: { id: number; returnedQuantity: number; condition: string }[]): Promise<void>;

  // Mobile Notes Import
  getMobileImportAliases(): Promise<MobileImportAlias[]>;
  createMobileImportAlias(data: InsertMobileImportAlias): Promise<MobileImportAlias>;
  updateMobileImportAlias(id: number, data: Partial<InsertMobileImportAlias>): Promise<MobileImportAlias | undefined>;
  getMobileImportHistory(): Promise<MobileImportHistory[]>;
  getMobileImportHistoryByHash(hash: string): Promise<MobileImportHistory | undefined>;
  createMobileImportHistory(data: InsertMobileImportHistory): Promise<MobileImportHistory>;

  // Salary Discount Rules
  getSalaryDiscountRules(): Promise<SalaryDiscountRule[]>;
  createSalaryDiscountRule(data: InsertSalaryDiscountRule): Promise<SalaryDiscountRule>;
  updateSalaryDiscountRule(id: number, data: Partial<InsertSalaryDiscountRule>): Promise<SalaryDiscountRule | undefined>;
  deleteSalaryDiscountRule(id: number): Promise<void>;

  // Salary Discounts
  getSalaryDiscounts(): Promise<SalaryDiscount[]>;
  createSalaryDiscount(data: InsertSalaryDiscount): Promise<SalaryDiscount>;
  updateSalaryDiscount(id: number, data: Partial<InsertSalaryDiscount>): Promise<SalaryDiscount | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }
  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return updated;
  }
  async updateUserPassword(id: number, password: string): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ password }).where(eq(users.id, id)).returning();
    return updated;
  }
  async updateUserRoleId(id: number, roleId: number | null): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ roleId } as any).where(eq(users.id, id)).returning();
    return updated;
  }
  async updateUserJobTitle(id: number, jobTitle: string): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ jobTitle } as any).where(eq(users.id, id)).returning();
    return updated;
  }
  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async clearOperationalData(): Promise<{ deleted: number; preservedUsers: number; preservedRoles: number }> {
    const [preservedUsers, preservedRoles, clientsBefore, servicesBefore, leadsBefore, jobsBefore, ordersBefore, inventoryBefore, movementsBefore, paymentsBefore, productsBefore, materialSalesBefore, transactionsBefore, obrasBefore, contractsBefore, warrantiesBefore, productionBefore, npsBefore, remindersBefore, withdrawalsBefore, discountsBefore] = await Promise.all([
      this.getUsers(), this.getRoles(), this.getClients(), this.getServices(), this.getLeads(), this.getJobs(), this.getWorkOrders(),
      this.getInventoryItems(), this.getInventoryMovements(), this.getPayments(), this.getProducts(), this.getMaterialSales(), this.getTransactions(),
      this.getObraRegistros(), this.getContracts(), this.getWarranties(), this.getProductionLogs(), this.getNpsResponses(),
      this.getMaintenanceReminders(), this.getMaterialWithdrawals(), this.getSalaryDiscounts(),
    ]);
    const deleted = [clientsBefore, servicesBefore, leadsBefore, jobsBefore, ordersBefore, inventoryBefore, movementsBefore, paymentsBefore, productsBefore, materialSalesBefore, transactionsBefore, obrasBefore, contractsBefore, warrantiesBefore, productionBefore, npsBefore, remindersBefore, withdrawalsBefore, discountsBefore]
      .reduce((sum, rows) => sum + rows.length, 0);
    await db.execute(sql.raw(`TRUNCATE TABLE
      salary_discounts, material_withdrawal_items, material_withdrawals,
      maintenance_reminders, nps_responses, production_logs, warranty_incidents, warranties,
      contracts, obra_consumo_logs, obra_registros, job_tracking, payments, transactions,
      material_sales, inventory_movements, inventory, products, work_orders, jobs, leads, clients, services
      RESTART IDENTITY CASCADE`));
    return { deleted, preservedUsers: preservedUsers.length, preservedRoles: preservedRoles.length };
  }

  // ─── Roles ──────────────────────────────────────────────────────────────────
  async getRoles(): Promise<Role[]> {
    return db.select().from(roles).orderBy(roles.id);
  }
  async getRole(id: number): Promise<Role | undefined> {
    const [r] = await db.select().from(roles).where(eq(roles.id, id));
    return r;
  }
  async createRole(data: InsertRole): Promise<Role> {
    const [r] = await db.insert(roles).values(data).returning();
    return r;
  }
  async updateRole(id: number, data: Partial<InsertRole>): Promise<Role | undefined> {
    const [r] = await db.update(roles).set(data).where(eq(roles.id, id)).returning();
    return r;
  }
  async deleteRole(id: number): Promise<void> {
    // Unlink users from this role first
    await db.update(users).set({ roleId: null } as any).where(eq((users as any).roleId, id));
    await db.delete(roles).where(eq(roles.id, id));
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }
  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }
  async updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const [updated] = await db.update(clients).set({...updates, updatedAt: new Date()}).where(eq(clients.id, id)).returning();
    return updated;
  }
  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Services
  async getServices(): Promise<Service[]> {
    return await db.select().from(services);
  }
  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }
  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }
  async updateService(id: number, updates: Partial<InsertService>): Promise<Service | undefined> {
    const [updated] = await db.update(services).set(updates).where(eq(services.id, id)).returning();
    return updated;
  }
  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  // Leads
  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads);
  }
  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }
  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }
  async updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updated] = await db.update(leads).set(updates).where(eq(leads.id, id)).returning();
    return updated;
  }
  async deleteLead(id: number): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  // Jobs
  async getJobs(): Promise<Job[]> {
    return await db.select().from(jobs);
  }
  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }
  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }
  async updateJob(id: number, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const [updated] = await db.update(jobs).set(updates).where(eq(jobs.id, id)).returning();
    return updated;
  }
  async deleteJob(id: number): Promise<void> {
    await db.delete(jobs).where(eq(jobs.id, id));
  }

  // Work Orders
  async getWorkOrders(): Promise<WorkOrder[]> {
    return await db.select().from(workOrders);
  }
  async getWorkOrder(id: number): Promise<WorkOrder | undefined> {
    const [order] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return order;
  }
  async createWorkOrder(order: InsertWorkOrder): Promise<WorkOrder> {
    const [newOrder] = await db.insert(workOrders).values(order).returning();
    return newOrder;
  }
  async updateWorkOrder(id: number, updates: Partial<InsertWorkOrder>): Promise<WorkOrder | undefined> {
    const [updated] = await db.update(workOrders).set(updates).where(eq(workOrders.id, id)).returning();
    return updated;
  }
  async deleteWorkOrder(id: number): Promise<void> {
    await db.delete(workOrders).where(eq(workOrders.id, id));
  }

  // Inventory
  async getInventoryItems(): Promise<Inventory[]> {
    return await db.select().from(inventory);
  }
  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const [newItem] = await db.insert(inventory).values(item).returning();
    return newItem;
  }
  async updateInventoryItem(id: number, updates: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const [updated] = await db.update(inventory).set(updates).where(eq(inventory.id, id)).returning();
    return updated;
  }
  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventory).where(eq(inventory.id, id));
  }
  async getInventoryMovements(): Promise<InventoryMovement[]> {
    return await db.select().from(inventoryMovements).orderBy(inventoryMovements.date);
  }
  async getInventoryMovementsByProduct(inventoryId: number): Promise<InventoryMovement[]> {
    return await db.select().from(inventoryMovements).where(eq(inventoryMovements.inventoryId, inventoryId)).orderBy(inventoryMovements.date);
  }
  async getInventoryMovement(id: number): Promise<InventoryMovement | undefined> {
    const [mov] = await db.select().from(inventoryMovements).where(eq(inventoryMovements.id, id));
    return mov;
  }
  async createInventoryMovement(data: { inventoryId: number; productName: string; type: string; quantity: number; date: string; month?: string; notes?: string }, options: { applyToStock?: boolean } = {}): Promise<InventoryMovement> {
    const [mov] = await db.insert(inventoryMovements).values(data).returning();
    if (options.applyToStock !== false) {
      const delta = data.type === "ENTRADA" ? data.quantity : -data.quantity;
      await db.update(inventory)
        .set({ quantity: sql`COALESCE(${inventory.quantity}, 0) + ${delta}` })
        .where(eq(inventory.id, data.inventoryId));
    }
    return mov;
  }
  async updateInventoryMovement(id: number, data: { inventoryId: number; productName: string; type: string; quantity: number; date: string; month?: string; notes?: string }): Promise<InventoryMovement | undefined> {
    const old = await this.getInventoryMovement(id);
    if (!old) return undefined;
    // Reverse old movement effect on inventory
    const oldDelta = old.type === "ENTRADA" ? -old.quantity : old.quantity;
    await db.update(inventory)
      .set({ quantity: sql`COALESCE(${inventory.quantity}, 0) + ${oldDelta}` })
      .where(eq(inventory.id, old.inventoryId));
    // Apply new movement effect on inventory
    const newDelta = data.type === "ENTRADA" ? data.quantity : -data.quantity;
    await db.update(inventory)
      .set({ quantity: sql`COALESCE(${inventory.quantity}, 0) + ${newDelta}` })
      .where(eq(inventory.id, data.inventoryId));
    // Update the movement record
    const [updated] = await db.update(inventoryMovements).set(data).where(eq(inventoryMovements.id, id)).returning();
    return updated;
  }
  async deleteInventoryMovement(id: number): Promise<void> {
    const old = await this.getInventoryMovement(id);
    if (!old) return;
    // Reverse the movement effect on inventory
    const delta = old.type === "ENTRADA" ? -old.quantity : old.quantity;
    await db.update(inventory)
      .set({ quantity: sql`COALESCE(${inventory.quantity}, 0) + ${delta}` })
      .where(eq(inventory.id, old.inventoryId));
    await db.delete(inventoryMovements).where(eq(inventoryMovements.id, id));
  }
  async decrementInventory(id: number, quantity: number): Promise<Inventory | undefined> {
    const [updated] = await db.update(inventory)
      .set({ quantity: sql`COALESCE(${inventory.quantity}, 0) - ${quantity}` })
      .where(eq(inventory.id, id))
      .returning();
    return updated;
  }
  async incrementInventory(id: number, quantity: number): Promise<Inventory | undefined> {
    const [updated] = await db.update(inventory)
      .set({ quantity: sql`COALESCE(${inventory.quantity}, 0) + ${quantity}` })
      .where(eq(inventory.id, id))
      .returning();
    return updated;
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    return await db.select().from(payments);
  }
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }
  async getPaymentsByJobId(jobId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.jobId, jobId));
  }
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }
  async updatePayment(id: number, updates: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [updated] = await db.update(payments).set(updates).where(eq(payments.id, id)).returning();
    return updated;
  }
  async deletePayment(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }
  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return updated;
  }
  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getMaterialSales(): Promise<MaterialSale[]> {
    return await db.select().from(materialSales).orderBy(desc(materialSales.createdAt));
  }
  async getMaterialSale(id: number): Promise<MaterialSale | undefined> {
    const [sale] = await db.select().from(materialSales).where(eq(materialSales.id, id));
    return sale;
  }
  async createMaterialSale(sale: InsertMaterialSale): Promise<MaterialSale> {
    const [created] = await db.insert(materialSales).values(sale).returning();
    return created;
  }
  async updateMaterialSale(id: number, updates: Partial<InsertMaterialSale>): Promise<MaterialSale | undefined> {
    const [updated] = await db.update(materialSales).set(updates).where(eq(materialSales.id, id)).returning();
    return updated;
  }
  async approveMaterialSale(id: number, approver: { id: number; username: string }): Promise<MaterialSale | undefined> {
    return db.transaction(async tx => {
      const [sale] = await tx.select().from(materialSales).where(eq(materialSales.id, id));
      if (!sale || sale.status !== "pendente") return sale;
      const items = JSON.parse(sale.items || "[]") as Array<{ inventoryId: number; name: string; quantity: number }>;
      const inventoryRows = await tx.select().from(inventory);
      const availableByInventoryId = new Map(inventoryRows.map(row => [row.id, Number(row.quantity) || 0]));
      for (const item of items) {
        const inventoryItem = inventoryRows.find(row => row.id === Number(item.inventoryId));
        const available = availableByInventoryId.get(Number(item.inventoryId)) ?? 0;
        const quantity = Number(item.quantity) || 0;
        if (!inventoryItem || available < quantity) {
          throw new Error(`Estoque insuficiente para ${item.name}`);
        }
        availableByInventoryId.set(Number(item.inventoryId), available - quantity);
      }

      const now = new Date();
      const month = now.toLocaleDateString("pt-BR", { month: "long" });
      for (const item of items) {
        await tx.insert(inventoryMovements).values({
          inventoryId: Number(item.inventoryId),
          productName: item.name,
          type: "SAÍDA",
          quantity: Number(item.quantity),
          date: now.toISOString().slice(0, 10),
          month,
          notes: `Venda de materiais #${sale.id}`,
        });
        await tx.update(inventory)
          .set({ quantity: sql`COALESCE(${inventory.quantity}, 0) - ${Number(item.quantity)}` })
          .where(eq(inventory.id, Number(item.inventoryId)));
      }

      const [approved] = await tx.update(materialSales).set({
        status: "aprovada",
        approvedByUserId: approver.id,
        approvedByUsername: approver.username,
        approvedAt: now,
      }).where(eq(materialSales.id, id)).returning();
      return approved;
    });
  }

  // Job Tracking
  async getJobTracking(workOrderId: number): Promise<JobTracking | undefined> {
    const [tracking] = await db.select().from(jobTracking).where(eq(jobTracking.workOrderId, workOrderId));
    return tracking;
  }
  async createJobTracking(tracking: InsertJobTracking): Promise<JobTracking> {
    const [newTracking] = await db.insert(jobTracking).values(tracking).returning();
    return newTracking;
  }
  async updateJobTracking(id: number, updates: Partial<InsertJobTracking>): Promise<JobTracking | undefined> {
    const [updated] = await db.update(jobTracking).set(updates).where(eq(jobTracking.id, id)).returning();
    return updated;
  }

  // Priority Rules
  async getPriorityRules(): Promise<PriorityRules | undefined> {
    const [rules] = await db.select().from(priorityRules).limit(1);
    return rules;
  }
  async updatePriorityRules(updates: Partial<InsertPriorityRules>): Promise<PriorityRules> {
    const existing = await this.getPriorityRules();
    if (existing) {
      const [updated] = await db.update(priorityRules).set(updates).where(eq(priorityRules.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(priorityRules).values(updates as any).returning();
      return created;
    }
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions);
  }
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }
  async deleteTransaction(id: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  // Settings
  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }
  async updateSetting(key: string, value: number): Promise<Setting> {
    // Upsert equivalent
    const [existing] = await db.select().from(settings).where(eq(settings.key, key));
    if (existing) {
      const [updated] = await db.update(settings).set({ value }).where(eq(settings.id, existing.id)).returning();
      return updated;
    } else {
      const [newSetting] = await db.insert(settings).values({ key, value }).returning();
      return newSetting;
    }
  }

  // Obra Registros
  async getObraRegistros(): Promise<ObraRegistro[]> {
    return await db.select().from(obraRegistros).orderBy(obraRegistros.createdAt);
  }
  async getObraRegistro(id: number): Promise<ObraRegistro | undefined> {
    const [registro] = await db.select().from(obraRegistros).where(eq(obraRegistros.id, id));
    return registro;
  }
  async getObraRegistrosByTipo(tipo: string): Promise<ObraRegistro[]> {
    return await db.select().from(obraRegistros).where(eq(obraRegistros.tipo, tipo)).orderBy(obraRegistros.createdAt);
  }
  async createObraRegistro(data: InsertObraRegistro): Promise<ObraRegistro> {
    const [created] = await db.insert(obraRegistros).values(data).returning();
    return created;
  }
  async updateObraRegistro(id: number, data: Partial<InsertObraRegistro>): Promise<ObraRegistro | undefined> {
    const [updated] = await db.update(obraRegistros).set({ ...data, updatedAt: new Date() }).where(eq(obraRegistros.id, id)).returning();
    return updated;
  }
  async deleteObraRegistro(id: number): Promise<void> {
    await db.delete(obraRegistros).where(eq(obraRegistros.id, id));
  }

  // Job Statuses
  async getJobStatuses(): Promise<JobStatus[]> {
    return await db.select().from(jobStatuses).orderBy(jobStatuses.sortOrder);
  }
  async getJobStatus(id: number): Promise<JobStatus | undefined> {
    const [status] = await db.select().from(jobStatuses).where(eq(jobStatuses.id, id));
    return status;
  }
  async createJobStatus(data: InsertJobStatus): Promise<JobStatus> {
    const [created] = await db.insert(jobStatuses).values(data).returning();
    return created;
  }
  async updateJobStatus(id: number, data: Partial<InsertJobStatus>): Promise<JobStatus | undefined> {
    const [updated] = await db.update(jobStatuses).set(data).where(eq(jobStatuses.id, id)).returning();
    return updated;
  }
  async deleteJobStatus(id: number): Promise<void> {
    await db.delete(jobStatuses).where(eq(jobStatuses.id, id));
  }

  // Payment Methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return await db.select().from(paymentMethods).orderBy(paymentMethods.id);
  }
  async getPaymentMethod(id: number): Promise<PaymentMethod | undefined> {
    const [pm] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
    return pm;
  }
  async createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod> {
    const [pm] = await db.insert(paymentMethods).values(data).returning();
    return pm;
  }
  async updatePaymentMethod(id: number, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined> {
    const [pm] = await db.update(paymentMethods).set(data).where(eq(paymentMethods.id, id)).returning();
    return pm;
  }
  async deletePaymentMethod(id: number): Promise<void> {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }

  // Payment Conditions
  async getPaymentConditions(): Promise<PaymentCondition[]> {
    return await db.select().from(paymentConditions).orderBy(paymentConditions.sortOrder, paymentConditions.id);
  }
  async getPaymentCondition(id: number): Promise<PaymentCondition | undefined> {
    const [pc] = await db.select().from(paymentConditions).where(eq(paymentConditions.id, id));
    return pc;
  }
  async createPaymentCondition(data: InsertPaymentCondition): Promise<PaymentCondition> {
    const [pc] = await db.insert(paymentConditions).values(data).returning();
    return pc;
  }
  async updatePaymentCondition(id: number, data: Partial<InsertPaymentCondition>): Promise<PaymentCondition | undefined> {
    const [pc] = await db.update(paymentConditions).set(data).where(eq(paymentConditions.id, id)).returning();
    return pc;
  }
  async deletePaymentCondition(id: number): Promise<void> {
    await db.delete(paymentConditions).where(eq(paymentConditions.id, id));
  }

  // Obra Consumo Logs
  async getObraConsumoLogs(workOrderId: number): Promise<ObraConsumoLog[]> {
    return await db.select().from(obraConsumoLogs)
      .where(eq(obraConsumoLogs.workOrderId, workOrderId))
      .orderBy(desc(obraConsumoLogs.createdAt));
  }
  async getObraConsumoLog(id: number): Promise<ObraConsumoLog | undefined> {
    const [log] = await db.select().from(obraConsumoLogs).where(eq(obraConsumoLogs.id, id));
    return log;
  }
  async createObraConsumoLog(data: InsertObraConsumoLog): Promise<ObraConsumoLog> {
    const [log] = await db.insert(obraConsumoLogs).values(data).returning();
    return log;
  }
  async deleteObraConsumoLog(id: number): Promise<void> {
    await db.delete(obraConsumoLogs).where(eq(obraConsumoLogs.id, id));
  }

  // ─── Contracts ─────────────────────────────────────────────────────────────
  async getContracts(): Promise<Contract[]> {
    return await db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }
  async getContract(id: number): Promise<Contract | undefined> {
    const [c] = await db.select().from(contracts).where(eq(contracts.id, id));
    return c;
  }
  async createContract(data: InsertContract): Promise<Contract> {
    const [c] = await db.insert(contracts).values(data).returning();
    return c;
  }
  async updateContract(id: number, data: Partial<InsertContract>): Promise<Contract | undefined> {
    const [c] = await db.update(contracts).set(data).where(eq(contracts.id, id)).returning();
    return c;
  }
  async deleteContract(id: number): Promise<void> {
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  // ─── Warranties ─────────────────────────────────────────────────────────────
  async getWarranties(): Promise<Warranty[]> {
    return await db.select().from(warranties).orderBy(desc(warranties.createdAt));
  }
  async getWarranty(id: number): Promise<Warranty | undefined> {
    const [w] = await db.select().from(warranties).where(eq(warranties.id, id));
    return w;
  }
  async createWarranty(data: InsertWarranty): Promise<Warranty> {
    const [w] = await db.insert(warranties).values(data).returning();
    return w;
  }
  async updateWarranty(id: number, data: Partial<InsertWarranty>): Promise<Warranty | undefined> {
    const [w] = await db.update(warranties).set(data).where(eq(warranties.id, id)).returning();
    return w;
  }
  async deleteWarranty(id: number): Promise<void> {
    await db.delete(warranties).where(eq(warranties.id, id));
  }

  // ─── Warranty Incidents ──────────────────────────────────────────────────────
  async getWarrantyIncidents(warrantyId: number): Promise<WarrantyIncident[]> {
    return await db.select().from(warrantyIncidents).where(eq(warrantyIncidents.warrantyId, warrantyId)).orderBy(desc(warrantyIncidents.createdAt));
  }
  async createWarrantyIncident(data: InsertWarrantyIncident): Promise<WarrantyIncident> {
    const [wi] = await db.insert(warrantyIncidents).values(data).returning();
    return wi;
  }
  async updateWarrantyIncident(id: number, data: Partial<InsertWarrantyIncident>): Promise<WarrantyIncident | undefined> {
    const [wi] = await db.update(warrantyIncidents).set(data).where(eq(warrantyIncidents.id, id)).returning();
    return wi;
  }
  async deleteWarrantyIncident(id: number): Promise<void> {
    await db.delete(warrantyIncidents).where(eq(warrantyIncidents.id, id));
  }

  // ─── Production Logs ─────────────────────────────────────────────────────────
  async getProductionLogs(): Promise<ProductionLog[]> {
    return await db.select().from(productionLogs).orderBy(desc(productionLogs.createdAt));
  }
  async createProductionLog(data: InsertProductionLog): Promise<ProductionLog> {
    const [pl] = await db.insert(productionLogs).values(data).returning();
    return pl;
  }
  async updateProductionLog(id: number, data: Partial<InsertProductionLog>): Promise<ProductionLog | undefined> {
    const [pl] = await db.update(productionLogs).set(data).where(eq(productionLogs.id, id)).returning();
    return pl;
  }
  async deleteProductionLog(id: number): Promise<void> {
    await db.delete(productionLogs).where(eq(productionLogs.id, id));
  }

  // ─── NPS Responses ───────────────────────────────────────────────────────────
  async getNpsResponses(): Promise<NpsResponse[]> {
    return await db.select().from(npsResponses).orderBy(desc(npsResponses.createdAt));
  }
  async createNpsResponse(data: InsertNpsResponse): Promise<NpsResponse> {
    const [r] = await db.insert(npsResponses).values(data).returning();
    return r;
  }
  async updateNpsResponse(id: number, data: Partial<InsertNpsResponse>): Promise<NpsResponse | undefined> {
    const [r] = await db.update(npsResponses).set(data).where(eq(npsResponses.id, id)).returning();
    return r;
  }
  async deleteNpsResponse(id: number): Promise<void> {
    await db.delete(npsResponses).where(eq(npsResponses.id, id));
  }

  // ─── Maintenance Reminders ───────────────────────────────────────────────────
  async getMaintenanceReminders(): Promise<MaintenanceReminder[]> {
    return await db.select().from(maintenanceReminders).orderBy(desc(maintenanceReminders.createdAt));
  }
  async createMaintenanceReminder(data: InsertMaintenanceReminder): Promise<MaintenanceReminder> {
    const [mr] = await db.insert(maintenanceReminders).values(data).returning();
    return mr;
  }
  async updateMaintenanceReminder(id: number, data: Partial<InsertMaintenanceReminder>): Promise<MaintenanceReminder | undefined> {
    const [mr] = await db.update(maintenanceReminders).set(data).where(eq(maintenanceReminders.id, id)).returning();
    return mr;
  }
  async deleteMaintenanceReminder(id: number): Promise<void> {
    await db.delete(maintenanceReminders).where(eq(maintenanceReminders.id, id));
  }

  // WhatsApp Send Logs
  async getWhatsappSendLogs(limit = 100): Promise<WhatsappSendLog[]> {
    return db.select().from(whatsappSendLogs).orderBy(desc(whatsappSendLogs.createdAt)).limit(limit);
  }
  async createWhatsappSendLog(data: InsertWhatsappSendLog): Promise<WhatsappSendLog> {
    const [log] = await db.insert(whatsappSendLogs).values(data).returning();
    return log;
  }

  async getWhatsappFlows(): Promise<WhatsappFlow[]> {
    return db.select().from(whatsappFlows).orderBy(whatsappFlows.sortOrder, whatsappFlows.createdAt);
  }
  async createWhatsappFlow(data: InsertWhatsappFlow): Promise<WhatsappFlow> {
    const [f] = await db.insert(whatsappFlows).values(data).returning();
    return f;
  }
  async updateWhatsappFlow(id: number, data: Partial<InsertWhatsappFlow>): Promise<WhatsappFlow | undefined> {
    const [f] = await db.update(whatsappFlows).set(data).where(eq(whatsappFlows.id, id)).returning();
    return f;
  }
  async deleteWhatsappFlow(id: number): Promise<void> {
    await db.delete(whatsappFlows).where(eq(whatsappFlows.id, id));
  }

  async getWhatsappTemplates(): Promise<WhatsappTemplate[]> {
    return db.select().from(whatsappTemplates).orderBy(whatsappTemplates.category, whatsappTemplates.createdAt);
  }
  async getWhatsappTemplatesByCategory(category: string): Promise<WhatsappTemplate[]> {
    return db.select().from(whatsappTemplates).where(eq(whatsappTemplates.category, category)).orderBy(whatsappTemplates.createdAt);
  }
  async createWhatsappTemplate(data: InsertWhatsappTemplate): Promise<WhatsappTemplate> {
    const [t] = await db.insert(whatsappTemplates).values(data).returning();
    return t;
  }
  async updateWhatsappTemplate(id: number, data: Partial<InsertWhatsappTemplate>): Promise<WhatsappTemplate | undefined> {
    const [t] = await db.update(whatsappTemplates).set(data).where(eq(whatsappTemplates.id, id)).returning();
    return t;
  }
  async deleteWhatsappTemplate(id: number): Promise<void> {
    await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, id));
  }

  // ── Quote PDF Templates ──────────────────────────────────────────────────────
  async getQuoteTemplates(): Promise<QuoteTemplate[]> {
    return db.select().from(quoteTemplates).orderBy(quoteTemplates.createdAt);
  }
  async getQuoteTemplate(id: number): Promise<QuoteTemplate | undefined> {
    const [t] = await db.select().from(quoteTemplates).where(eq(quoteTemplates.id, id));
    return t;
  }
  async getDefaultQuoteTemplate(): Promise<QuoteTemplate | undefined> {
    const [t] = await db.select().from(quoteTemplates).where(eq(quoteTemplates.isDefault, true)).limit(1);
    return t;
  }
  async createQuoteTemplate(data: InsertQuoteTemplate): Promise<QuoteTemplate> {
    const [t] = await db.insert(quoteTemplates).values(data).returning();
    return t;
  }
  async updateQuoteTemplate(id: number, data: Partial<InsertQuoteTemplate>): Promise<QuoteTemplate | undefined> {
    const [t] = await db.update(quoteTemplates).set({ ...data, updatedAt: new Date() }).where(eq(quoteTemplates.id, id)).returning();
    return t;
  }
  async setDefaultQuoteTemplate(id: number): Promise<void> {
    // Remove default from all
    await db.update(quoteTemplates).set({ isDefault: false });
    // Set this one as default
    await db.update(quoteTemplates).set({ isDefault: true }).where(eq(quoteTemplates.id, id));
  }
  async deleteQuoteTemplate(id: number): Promise<void> {
    await db.delete(quoteTemplates).where(eq(quoteTemplates.id, id));
  }

  // Cost Config
  async getCostConfig(): Promise<CostConfig | undefined> {
    const [config] = await db.select().from(costConfig).limit(1);
    return config;
  }
  async updateCostConfig(updates: Partial<InsertCostConfig>): Promise<CostConfig> {
    const existing = await this.getCostConfig();
    if (existing) {
      const [updated] = await db.update(costConfig).set({ ...updates, updatedAt: new Date() }).where(eq(costConfig.id, existing.id)).returning();
      return updated;
    } else {
      const defaults: InsertCostConfig = {
        laborDailyRate: 800,
        laborHourlyRate: 100,
        transportCostPerKm: 1.5,
        transportMinimumCost: 50,
        minMarginPercent: 0.30,
        idealMarginPercent: 0.40,
        alertMarginPercent: 0.30,
        prohibitedMarginPercent: 0.25,
        minimumServiceValue: 1000,
      };
      const [created] = await db.insert(costConfig).values({ ...defaults, ...updates }).returning();
      return created;
    }
  }

  // ─── Material Withdrawals ───────────────────────────────────────────────────
  async getMaterialWithdrawals(): Promise<(MaterialWithdrawal & { items: MaterialWithdrawalItem[] })[]> {
    const ws = await db.select().from(materialWithdrawals).orderBy(desc(materialWithdrawals.createdAt));
    const allItems = await db.select().from(materialWithdrawalItems);
    return ws.map(w => ({ ...w, items: allItems.filter(i => i.withdrawalId === w.id) }));
  }

  async getMaterialWithdrawal(id: number): Promise<(MaterialWithdrawal & { items: MaterialWithdrawalItem[] }) | undefined> {
    const [w] = await db.select().from(materialWithdrawals).where(eq(materialWithdrawals.id, id));
    if (!w) return undefined;
    const items = await db.select().from(materialWithdrawalItems).where(eq(materialWithdrawalItems.withdrawalId, id));
    return { ...w, items };
  }

  async createMaterialWithdrawal(data: InsertMaterialWithdrawal, items: InsertMaterialWithdrawalItem[]): Promise<MaterialWithdrawal & { items: MaterialWithdrawalItem[] }> {
    const [w] = await db.insert(materialWithdrawals).values(data).returning();
    const savedItems = items.length > 0
      ? await db.insert(materialWithdrawalItems).values(items.map(i => ({ ...i, withdrawalId: w.id }))).returning()
      : [];
    return { ...w, items: savedItems };
  }

  async updateMaterialWithdrawal(id: number, data: Partial<InsertMaterialWithdrawal>): Promise<MaterialWithdrawal | undefined> {
    const [updated] = await db.update(materialWithdrawals).set(data).where(eq(materialWithdrawals.id, id)).returning();
    return updated;
  }

  async updateMaterialWithdrawalItems(withdrawalId: number, items: { id: number; returnedQuantity: number; condition: string }[]): Promise<void> {
    for (const item of items) {
      await db.update(materialWithdrawalItems)
        .set({ returnedQuantity: Number(item.returnedQuantity) || 0, condition: item.condition })
        .where(and(eq(materialWithdrawalItems.id, item.id), eq(materialWithdrawalItems.withdrawalId, withdrawalId)));
    }
  }

  // ─── Mobile Notes Import ───────────────────────────────────────────────────
  async getMobileImportAliases(): Promise<MobileImportAlias[]> {
    return db.select().from(mobileImportAliases).orderBy(mobileImportAliases.alias);
  }

  async createMobileImportAlias(data: InsertMobileImportAlias): Promise<MobileImportAlias> {
    const [alias] = await db.insert(mobileImportAliases).values(data).returning();
    return alias;
  }

  async updateMobileImportAlias(id: number, data: Partial<InsertMobileImportAlias>): Promise<MobileImportAlias | undefined> {
    const [updated] = await db.update(mobileImportAliases).set(data).where(eq(mobileImportAliases.id, id)).returning();
    return updated;
  }

  async getMobileImportHistory(): Promise<MobileImportHistory[]> {
    return db.select().from(mobileImportHistory).orderBy(desc(mobileImportHistory.createdAt));
  }

  async getMobileImportHistoryByHash(hash: string): Promise<MobileImportHistory | undefined> {
    const [history] = await db.select().from(mobileImportHistory).where(eq(mobileImportHistory.hash, hash));
    return history;
  }

  async createMobileImportHistory(data: InsertMobileImportHistory): Promise<MobileImportHistory> {
    const [history] = await db.insert(mobileImportHistory).values(data).returning();
    return history;
  }

  // ─── Salary Discount Rules ──────────────────────────────────────────────────
  async getSalaryDiscountRules(): Promise<SalaryDiscountRule[]> {
    return db.select().from(salaryDiscountRules).orderBy(salaryDiscountRules.id);
  }

  async createSalaryDiscountRule(data: InsertSalaryDiscountRule): Promise<SalaryDiscountRule> {
    const [rule] = await db.insert(salaryDiscountRules).values(data).returning();
    return rule;
  }

  async updateSalaryDiscountRule(id: number, data: Partial<InsertSalaryDiscountRule>): Promise<SalaryDiscountRule | undefined> {
    const [updated] = await db.update(salaryDiscountRules).set(data).where(eq(salaryDiscountRules.id, id)).returning();
    return updated;
  }

  async deleteSalaryDiscountRule(id: number): Promise<void> {
    await db.delete(salaryDiscountRules).where(eq(salaryDiscountRules.id, id));
  }

  // ─── Salary Discounts ───────────────────────────────────────────────────────
  async getSalaryDiscounts(): Promise<SalaryDiscount[]> {
    return db.select().from(salaryDiscounts).orderBy(desc(salaryDiscounts.createdAt));
  }

  async createSalaryDiscount(data: InsertSalaryDiscount): Promise<SalaryDiscount> {
    const [disc] = await db.insert(salaryDiscounts).values(data).returning();
    return disc;
  }

  async updateSalaryDiscount(id: number, data: Partial<InsertSalaryDiscount>): Promise<SalaryDiscount | undefined> {
    const [updated] = await db.update(salaryDiscounts).set(data).where(eq(salaryDiscounts.id, id)).returning();
    return updated;
  }

  async getCompleteBackupData(): Promise<CompleteBackupData> {
    const snapshot: CompleteBackupData = {};
    for (const [key, config] of Object.entries(COMPLETE_TABLES)) {
      snapshot[key] = await (db as any).select().from(config.table);
    }
    return snapshot;
  }

  async restoreCompleteBackup(
    data: CompleteBackupData,
    modules: CompleteBackupModule[],
    mode: CompleteRestoreMode,
  ): Promise<{ tables: Record<string, number>; total: number }> {
    const tableKeys = selectedCompleteTables(modules);
    const client = await pool.connect();
    const restored: Record<string, number> = {};

    try {
      await client.query("BEGIN");

      if (mode === "replace") {
        for (const key of [...tableKeys].reverse()) {
          const config = COMPLETE_TABLES[key];
          await client.query(`DELETE FROM ${quoteIdentifier(config.dbName)}`);
        }
      }

      for (const key of tableKeys) {
        const config = COMPLETE_TABLES[key];
        const rows = Array.isArray(data[key]) ? data[key] : [];
        const schemaColumns = getTableColumns(config.table) as Record<string, { name: string }>;

        for (const row of rows) {
          const entries = Object.entries(schemaColumns).filter(([property]) => row[property] !== undefined);
          if (entries.length === 0) continue;
          const columnNames = entries.map(([, column]) => quoteIdentifier(column.name));
          const values = entries.map(([property]) => row[property] ?? null);
          const placeholders = values.map((_, index) => `$${index + 1}`);
          const hasId = entries.some(([property]) => property === "id");
          const updates = entries
            .filter(([property]) => property !== "id")
            .map(([, column]) => `${quoteIdentifier(column.name)} = EXCLUDED.${quoteIdentifier(column.name)}`);
          const conflict = hasId
            ? updates.length > 0
              ? ` ON CONFLICT ("id") DO UPDATE SET ${updates.join(", ")}`
              : " ON CONFLICT (\"id\") DO NOTHING"
            : "";
          await client.query(
            `INSERT INTO ${quoteIdentifier(config.dbName)} (${columnNames.join(", ")}) VALUES (${placeholders.join(", ")})${conflict}`,
            values,
          );
        }

        restored[key] = rows.length;
        await client.query(
          `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM ${quoteIdentifier(config.dbName)}`,
          [config.dbName],
        );
      }

      await client.query("COMMIT");
      return { tables: restored, total: Object.values(restored).reduce((sum, count) => sum + count, 0) };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export function createMemoryStorage(): IStorage {
  const data: Record<string, any[]> = {
    users: [],
    roles: [],
    clients: [],
    services: [],
    leads: [],
    jobs: [],
    workOrders: [],
    inventory: [],
    inventoryMovements: [],
    payments: [],
    products: [],
    materialSales: [],
    jobTracking: [],
    priorityRules: [],
    transactions: [],
    settings: [],
    costConfig: [],
    obraRegistros: [],
    jobStatuses: [],
    paymentMethods: [],
    paymentConditions: [],
    obraConsumoLogs: [],
    contracts: [],
    warranties: [],
    warrantyIncidents: [],
    productionLogs: [],
    npsResponses: [],
    maintenanceReminders: [],
    whatsappFlows: [],
    whatsappSendLogs: [],
    whatsappTemplates: [],
    quoteTemplates: [],
    materialWithdrawals: [],
    materialWithdrawalItems: [],
    mobileImportAliases: [],
    mobileImportHistory: [],
    salaryDiscountRules: [],
    salaryDiscounts: [],
  };

  const ids: Record<string, number> = Object.fromEntries(Object.keys(data).map(key => [key, 1]));
  const now = () => new Date();
  const insert = (table: string, row: any) => {
    const saved = { id: ids[table]++, ...row, createdAt: row.createdAt ?? now() };
    data[table].push(saved);
    return saved;
  };
  const updateById = (table: string, id: number, updates: any) => {
    const index = data[table].findIndex(row => row.id === id);
    if (index < 0) return undefined;
    data[table][index] = { ...data[table][index], ...updates, updatedAt: updates.updatedAt ?? data[table][index].updatedAt };
    return data[table][index];
  };
  const deleteById = (table: string, id: number) => {
    data[table] = data[table].filter(row => row.id !== id);
  };

  const tableMap: Record<string, string> = {
    User: "users",
    Users: "users",
    Role: "roles",
    Roles: "roles",
    Client: "clients",
    Clients: "clients",
    Service: "services",
    Services: "services",
    Lead: "leads",
    Leads: "leads",
    Job: "jobs",
    Jobs: "jobs",
    WorkOrder: "workOrders",
    WorkOrders: "workOrders",
    InventoryItem: "inventory",
    InventoryItems: "inventory",
    InventoryMovement: "inventoryMovements",
    InventoryMovements: "inventoryMovements",
    Payment: "payments",
    Payments: "payments",
    Product: "products",
    Products: "products",
    MaterialSale: "materialSales",
    MaterialSales: "materialSales",
    JobTracking: "jobTracking",
    PriorityRules: "priorityRules",
    Transaction: "transactions",
    Transactions: "transactions",
    Setting: "settings",
    Settings: "settings",
    CostConfig: "costConfig",
    ObraRegistro: "obraRegistros",
    ObraRegistros: "obraRegistros",
    JobStatus: "jobStatuses",
    JobStatuses: "jobStatuses",
    PaymentMethod: "paymentMethods",
    PaymentMethods: "paymentMethods",
    PaymentCondition: "paymentConditions",
    PaymentConditions: "paymentConditions",
    ObraConsumoLog: "obraConsumoLogs",
    ObraConsumoLogs: "obraConsumoLogs",
    WhatsappFlow: "whatsappFlows",
    WhatsappFlows: "whatsappFlows",
    WhatsappSendLog: "whatsappSendLogs",
    WhatsappSendLogs: "whatsappSendLogs",
    WhatsappTemplate: "whatsappTemplates",
    WhatsappTemplates: "whatsappTemplates",
    QuoteTemplate: "quoteTemplates",
    QuoteTemplates: "quoteTemplates",
    Contract: "contracts",
    Contracts: "contracts",
    Warranty: "warranties",
    Warranties: "warranties",
    WarrantyIncident: "warrantyIncidents",
    WarrantyIncidents: "warrantyIncidents",
    ProductionLog: "productionLogs",
    ProductionLogs: "productionLogs",
    NpsResponse: "npsResponses",
    NpsResponses: "npsResponses",
    MaintenanceReminder: "maintenanceReminders",
    MaintenanceReminders: "maintenanceReminders",
    MaterialWithdrawal: "materialWithdrawals",
    MaterialWithdrawals: "materialWithdrawals",
    MobileImportAlias: "mobileImportAliases",
    MobileImportAliases: "mobileImportAliases",
    MobileImportHistory: "mobileImportHistory",
    SalaryDiscountRule: "salaryDiscountRules",
    SalaryDiscountRules: "salaryDiscountRules",
    SalaryDiscount: "salaryDiscounts",
    SalaryDiscounts: "salaryDiscounts",
  };

  const getTable = (name: string) => tableMap[name] || tableMap[name.replace(/s$/, "")] || "";

  const storageTarget: Record<string, any> = {
    getCompleteBackupData: async () => Object.fromEntries(
      Object.keys(COMPLETE_TABLES).map(key => [key, structuredClone(data[key] || [])]),
    ),
    restoreCompleteBackup: async (backupData: CompleteBackupData, modules: CompleteBackupModule[], mode: CompleteRestoreMode) => {
      const restored: Record<string, number> = {};
      for (const key of selectedCompleteTables(modules)) {
        const rows = Array.isArray(backupData[key]) ? structuredClone(backupData[key]) : [];
        if (mode === "replace") data[key] = [];
        for (const row of rows) {
          const index = data[key].findIndex(existing => existing.id === row.id);
          if (index >= 0) data[key][index] = { ...data[key][index], ...row };
          else data[key].push(row);
        }
        ids[key] = Math.max(0, ...data[key].map(row => Number(row.id) || 0)) + 1;
        restored[key] = rows.length;
      }
      return { tables: restored, total: Object.values(restored).reduce((sum, count) => sum + count, 0) };
    },
    getUserByUsername: async (username: string) => data.users.find(user => user.username === username),
    updateUserPassword: async (id: number, password: string) => updateById("users", id, { password }),
    updateUserRole: async (id: number, role: string) => updateById("users", id, { role }),
    updateUserRoleId: async (id: number, roleId: number | null) => updateById("users", id, { roleId }),
    updateUserJobTitle: async (id: number, jobTitle: string) => updateById("users", id, { jobTitle }),
    clearOperationalData: async () => {
      const preservedUsers = data.users.length;
      const preservedRoles = data.roles.length;
      const preservedTables = new Set(["users", "roles", "settings", "costConfig", "priorityRules", "jobStatuses", "paymentMethods", "paymentConditions", "whatsappFlows", "whatsappTemplates", "quoteTemplates", "salaryDiscountRules"]);
      let deleted = 0;
      Object.keys(data).forEach(table => {
        if (preservedTables.has(table)) return;
        deleted += data[table].length;
        data[table] = [];
        ids[table] = 1;
      });
      return { deleted, preservedUsers, preservedRoles };
    },
    updateSetting: async (key: string, value: number) => {
      const existing = data.settings.find(setting => setting.key === key);
      if (existing) return Object.assign(existing, { value });
      return insert("settings", { key, value });
    },
    approveMaterialSale: async (id: number, approver: { id: number; username: string }) => {
      const sale = data.materialSales.find(row => row.id === id);
      if (!sale || sale.status !== "pendente") return sale;
      const items = JSON.parse(sale.items || "[]");
      const availableByInventoryId = new Map(data.inventory.map(row => [row.id, Number(row.quantity) || 0]));
      for (const item of items) {
        const inventoryItem = data.inventory.find(row => row.id === Number(item.inventoryId));
        const available = availableByInventoryId.get(Number(item.inventoryId)) ?? 0;
        const quantity = Number(item.quantity) || 0;
        if (!inventoryItem || available < quantity) throw new Error(`Estoque insuficiente para ${item.name}`);
        availableByInventoryId.set(Number(item.inventoryId), available - quantity);
      }
      for (const item of items) {
        const inventoryItem = data.inventory.find(row => row.id === Number(item.inventoryId));
        inventoryItem.quantity -= Number(item.quantity);
        insert("inventoryMovements", {
          inventoryId: Number(item.inventoryId), productName: item.name, type: "SAÍDA", quantity: Number(item.quantity),
          date: new Date().toISOString().slice(0, 10), notes: `Venda de materiais #${sale.id}`,
        });
      }
      return Object.assign(sale, { status: "aprovada", approvedByUserId: approver.id, approvedByUsername: approver.username, approvedAt: now() });
    },
    getCostConfig: async () => data.costConfig[0],
    updateCostConfig: async (updates: any) => {
      if (data.costConfig[0]) return Object.assign(data.costConfig[0], updates, { updatedAt: now() });
      return insert("costConfig", { ...updates, updatedAt: now() });
    },
    getPriorityRules: async () => data.priorityRules[0],
    updatePriorityRules: async (updates: any) => {
      if (data.priorityRules[0]) return Object.assign(data.priorityRules[0], updates, { updatedAt: now() });
      return insert("priorityRules", { ...updates, updatedAt: now() });
    },
    getInventoryMovementsByProduct: async (inventoryId: number) => data.inventoryMovements.filter(row => row.inventoryId === inventoryId),
    getInventoryMovement: async (id: number) => data.inventoryMovements.find(row => row.id === id),
    createInventoryMovement: async (row: any, options: { applyToStock?: boolean } = {}) => {
      const movement = insert("inventoryMovements", row || {});
      if (options.applyToStock !== false) {
        const item = data.inventory.find(inv => inv.id === movement.inventoryId);
        if (item) item.quantity = Number(item.quantity || 0) + (movement.type === "ENTRADA" ? Number(movement.quantity || 0) : -Number(movement.quantity || 0));
      }
      return movement;
    },
    updateInventoryMovement: async (id: number, updates: any) => {
      const old = data.inventoryMovements.find(row => row.id === id);
      if (!old) return undefined;
      const oldItem = data.inventory.find(inv => inv.id === old.inventoryId);
      if (oldItem) oldItem.quantity = Number(oldItem.quantity || 0) + (old.type === "ENTRADA" ? -Number(old.quantity || 0) : Number(old.quantity || 0));
      Object.assign(old, updates || {});
      const newItem = data.inventory.find(inv => inv.id === old.inventoryId);
      if (newItem) newItem.quantity = Number(newItem.quantity || 0) + (old.type === "ENTRADA" ? Number(old.quantity || 0) : -Number(old.quantity || 0));
      return old;
    },
    deleteInventoryMovement: async (id: number) => {
      const old = data.inventoryMovements.find(row => row.id === id);
      if (!old) return;
      const item = data.inventory.find(inv => inv.id === old.inventoryId);
      if (item) item.quantity = Number(item.quantity || 0) + (old.type === "ENTRADA" ? -Number(old.quantity || 0) : Number(old.quantity || 0));
      deleteById("inventoryMovements", id);
    },
    getPaymentsByJobId: async (jobId: number) => data.payments.filter(row => row.jobId === jobId),
    getJobTracking: async (workOrderId: number) => data.jobTracking.find(row => row.workOrderId === workOrderId),
    getObraRegistrosByTipo: async (tipo: string) => data.obraRegistros.filter(row => row.tipo === tipo),
    getObraConsumoLogs: async (workOrderId: number) => data.obraConsumoLogs.filter(row => row.workOrderId === workOrderId),
    getObraConsumoLog: async (id: number) => data.obraConsumoLogs.find(row => row.id === id),
    getWhatsappTemplatesByCategory: async (category: string) => data.whatsappTemplates.filter(row => row.category === category),
    getDefaultQuoteTemplate: async () => data.quoteTemplates.find(row => row.isDefault),
    setDefaultQuoteTemplate: async (id: number) => {
      data.quoteTemplates.forEach(row => { row.isDefault = row.id === id; });
    },
    getWarrantyIncidents: async (warrantyId: number) => data.warrantyIncidents.filter(row => row.warrantyId === warrantyId),
    getMaterialWithdrawals: async () => data.materialWithdrawals.map(withdrawal => ({
      ...withdrawal,
      items: data.materialWithdrawalItems.filter(item => item.withdrawalId === withdrawal.id),
    })),
    getMaterialWithdrawal: async (id: number) => {
      const withdrawal = data.materialWithdrawals.find(row => row.id === id);
      if (!withdrawal) return undefined;
      return { ...withdrawal, items: data.materialWithdrawalItems.filter(item => item.withdrawalId === id) };
    },
    createMaterialWithdrawal: async (row: any, items: any[]) => {
      const withdrawal = insert("materialWithdrawals", row);
      const savedItems = items.map(item => insert("materialWithdrawalItems", { ...item, withdrawalId: withdrawal.id }));
      return { ...withdrawal, items: savedItems };
    },
    updateMaterialWithdrawalItems: async (_withdrawalId: number, items: { id: number; returnedQuantity: number; condition: string }[]) => {
      items.forEach(item => updateById("materialWithdrawalItems", item.id, item));
    },
    getMobileImportHistoryByHash: async (hash: string) => data.mobileImportHistory.find(row => row.hash === hash),
  };

  return new Proxy(storageTarget, {
    get(target, prop) {
      if (typeof prop !== "string") return (target as any)[prop];
      if (prop in target) return target[prop];

      if (prop.startsWith("get")) {
        return async (id?: number) => {
          const entity = prop.replace(/^get/, "");
          const table = getTable(entity);
          if (!table) return undefined;
          if (typeof id === "number" && !entity.endsWith("s")) return data[table].find(row => row.id === id);
          return [...data[table]];
        };
      }

      if (prop.startsWith("create")) {
        return async (row: any) => {
          const table = getTable(prop.replace(/^create/, ""));
          return insert(table, row || {});
        };
      }

      if (prop.startsWith("update")) {
        return async (id: number, updates: any) => {
          const table = getTable(prop.replace(/^update/, ""));
          return updateById(table, id, updates || {});
        };
      }

      if (prop.startsWith("delete")) {
        return async (id: number) => {
          const table = getTable(prop.replace(/^delete/, ""));
          deleteById(table, id);
        };
      }

      return undefined;
    },
  }) as IStorage;
}

export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : createMemoryStorage();
