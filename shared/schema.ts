import { pgTable, text, serial, integer, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  label: text("label").notNull(),
  permissions: text("permissions").notNull().default('{}'),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default('funcionario'), // 'admin' or 'funcionario'
  roleId: integer("role_id"),
  jobTitle: text("job_title"),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  cpfCnpj: text("cpf_cnpj"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  pricePerUnit: real("price_per_unit").default(0),
  materialConsumptionPerM2: real("material_consumption_per_m2").notNull().default(0),
  laborCostPerM2: real("labor_cost_per_m2").notNull().default(0),
  transportCostPerM2: real("transport_cost_per_m2").notNull().default(0),
  defaultMargin: real("default_margin").notNull().default(0.40),
  serviceMaterials: text("service_materials"), // JSON: [{inventoryId, name, unit: "per_m2"|"fixed", quantity}]
  createdAt: timestamp("created_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  source: text("source"),
  status: text("status").notNull().default("New Lead"),
  notes: text("notes"),
  nextContactDate: timestamp("next_contact_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id"),
  clientId: integer("client_id"),
  clientName: text("client_name").notNull(),
  serviceType: text("service_type").notNull(),
  squareMeters: real("square_meters").notNull().default(0),
  status: text("status").notNull().default("Lead"),
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, partial, paid
  
  locationRegion: text("location_region"),
  inspectionNotes: text("inspection_notes"),
  executionDeadline: timestamp("execution_deadline"),
  clientes: text("clientes"), // JSON: [{nome, cargo, telefone, endereco, cidade}]
  
  materialCost: real("material_cost").default(0),
  laborCost: real("labor_cost").default(0),
  transportCost: real("transport_cost").default(0),
  equipmentCost: real("equipment_cost").default(0),
  
  materialsUsed: text("materials_used"), // JSON string with material usage {inventoryId, quantity, cost}
  serviceItems: text("service_items"), // JSON: [{name, area, unitPrice, total}]
  responsaveis: text("responsaveis"), // JSON: [{nome, cargo, telefone}]
  
  calculatedPrice: real("calculated_price").default(0),
  realPriceSold: real("real_price_sold").default(0),
  profit: real("profit").default(0),
  margin: real("margin").default(0),
  orcamentoNumero: integer("orcamento_numero"), // custom/override number for PDF display
  paymentMethodId: integer("payment_method_id"), // FK to payment_methods
  paymentConditionIds: text("payment_condition_ids"), // JSON: number[] — IDs of selected paymentConditions
  pdfOptions: text("pdf_options"), // JSON: { materialDisplayMode, showMaterialsToClient }

  createdAt: timestamp("created_at").defaultNow(),
});

export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id"),
  clientId: integer("client_id"),
  clientName: text("client_name").notNull(),
  address: text("address"),
  serviceType: text("service_type").notNull(),
  materialsNeeded: text("materials_needed"), // JSON string with materials list
  scheduledDate: timestamp("scheduled_date"),
  teamAssigned: text("team_assigned"),
  status: text("status").notNull().default("Planejada"),
  photos: text("photos"), // JSON string with photos {category: "before"|"during"|"after", data: base64, timestamp}
  notes: text("notes"),
  // Registro de Obra fields
  selectedServices: text("selected_services"), // JSON: list of service names selected for execution
  serviceProgress: text("service_progress"), // JSON: [{serviceName, started, startDate, endDate, finished, realMaterials: [{name, inventoryId, plannedQty, realQty}], observations}]
  obraObservations: text("obra_observations"), // General observations for the whole OS
  checklistDone: text("checklist_done"), // JSON: {[itemKey: string]: boolean} — checklist técnico da obra
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  unit: text("unit").default("unid"),
  quantity: integer("quantity").notNull().default(0),
  minStock: integer("min_stock").notNull().default(5),
  pricePerUnit: real("price_per_unit").default(0),
});

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").notNull(),
  productName: text("product_name").notNull(),
  type: text("type").notNull(), // ENTRADA | SAÍDA
  quantity: integer("quantity").notNull(),
  date: text("date").notNull(), // ISO string YYYY-MM-DD
  month: text("month"), // ex: "Janeiro", "Fevereiro"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // inflow, outflow
  category: text("category").notNull(), 
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  clientName: text("client_name").notNull(),
  amount: real("amount").notNull(),
  paymentMethod: text("payment_method").notNull(), // transfer, cash, check, card, pix
  date: timestamp("date").defaultNow(),
  status: text("status").notNull().default("completed"), // completed, pending, failed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id"),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category").default("Sem Categoria"),
  code: text("code"),
  imageUrl: text("image_url"),
  brand: text("brand"),
  unit: text("unit").default("un"),
  salePrice: real("sale_price").notNull().default(0),
  commission: real("commission").notNull().default(0),
  maxDiscount: real("max_discount").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobTracking = pgTable("job_tracking", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").notNull(),
  checkinTime: timestamp("checkin_time").notNull(),
  checkoutTime: timestamp("checkout_time"),
  photos: text("photos"), // JSON string with photos during work
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const priorityRules = pgTable("priority_rules", {
  id: serial("id").primaryKey(),
  // Service Type Scores
  mantaAsfálticaScore: real("manta_asfaltica_score").notNull().default(5),
  piscinaScore: real("piscina_score").notNull().default(3),
  reparoScore: real("reparo_score").notNull().default(2),
  
  // Size Scores
  sizeGrandeThreshold: real("size_grande_threshold").notNull().default(20),
  sizeGrandeScore: real("size_grande_score").notNull().default(4),
  sizeMédioMin: real("size_medio_min").notNull().default(10),
  sizeMédioMax: real("size_medio_max").notNull().default(20),
  sizeMédioScore: real("size_medio_score").notNull().default(2),
  sizePequenoScore: real("size_pequeno_score").notNull().default(1),
  
  // Distance Scores
  distancePróximoThreshold: real("distance_proximo_threshold").notNull().default(10),
  distancePróximoScore: real("distance_proximo_score").notNull().default(3),
  distanceMédioMin: real("distance_medio_min").notNull().default(10),
  distanceMédioMax: real("distance_medio_max").notNull().default(25),
  distanceMédioScore: real("distance_medio_score").notNull().default(2),
  distanceLongeScore: real("distance_longe_score").notNull().default(0),
  
  // Financial Return Scores
  returnAltoScore: real("return_alto_score").notNull().default(4),
  returnMédioScore: real("return_medio_score").notNull().default(2),
  returnBaixoScore: real("return_baixo_score").notNull().default(0),
  
  // Priority Thresholds
  priorityAltaThreshold: real("priority_alta_threshold").notNull().default(12),
  priorityMédiaMin: real("priority_media_min").notNull().default(8),
  priorityBaixaMax: real("priority_baixa_max").notNull().default(7),
  
  // Auto-reject rules
  autoRejectThreshold: real("auto_reject_threshold").notNull().default(7),
  badFactorCountThreshold: integer("bad_factor_count_threshold").notNull().default(2),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const costConfig = pgTable("cost_config", {
  id: serial("id").primaryKey(),
  laborDailyRate: real("labor_daily_rate").notNull().default(800),
  laborHourlyRate: real("labor_hourly_rate").notNull().default(100),
  transportCostPerKm: real("transport_cost_per_km").notNull().default(1.5),
  transportMinimumCost: real("transport_minimum_cost").notNull().default(50),
  minMarginPercent: real("min_margin_percent").notNull().default(0.30),
  idealMarginPercent: real("ideal_margin_percent").notNull().default(0.40),
  alertMarginPercent: real("alert_margin_percent").notNull().default(0.30),
  prohibitedMarginPercent: real("prohibited_margin_percent").notNull().default(0.25),
  minimumServiceValue: real("minimum_service_value").notNull().default(1000),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const obraRegistros = pgTable("obra_registros", {
  id: serial("id").primaryKey(),
  // Tipo do formulário
  tipo: text("tipo").notNull(), // "antes" | "durante" | "depois"
  // Informações gerais
  nomeObra: text("nome_obra").notNull(),
  enderecoObra: text("endereco_obra").notNull(),
  nomeResponsavel: text("nome_responsavel").notNull(),
  nomeEquipe: text("nome_equipe").notNull(),
  dataInicio: text("data_inicio").notNull(),
  dataPrevisaoTermino: text("data_previsao_termino").notNull(),
  // Campos específicos por tipo
  descricaoProblema: text("descricao_problema"),       // ANTES
  tipoServico: text("tipo_servico"),                    // ANTES
  etapaAtual: text("etapa_atual"),                     // DURANTE
  descricaoAndamento: text("descricao_andamento"),     // DURANTE
  servicoFinalizado: text("servico_finalizado"),        // DEPOIS ("sim" | "nao")
  observacoesFinais: text("observacoes_finais"),        // DEPOIS
  // Fotos armazenadas como JSON array de { nome, base64, tamanho }
  fotos: text("fotos").default("[]"),
  // Vínculo com obra/job (opcional)
  jobId: integer("job_id"),
  status: text("status").notNull().default("enviado"), // enviado | revisado
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  discountPercent: real("discount_percent").notNull().default(0), // negative = discount, positive = surcharge
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Payment Conditions — multi-select text blocks shown on the PDF ───────────
export const paymentConditions = pgTable("payment_conditions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),       // Ex: "À Vista", "Cartão de Crédito"
  fullText: text("full_text").notNull(), // Full text block to appear in the PDF
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Contratos e Documentos ───────────────────────────────────────────────────
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id"),
  workOrderId: integer("work_order_id"),
  clientName: text("client_name").notNull(),
  serviceType: text("service_type"),
  contractText: text("contract_text"),
  status: text("status").notNull().default("gerado"), // gerado | assinado | cancelado
  signedDocumentData: text("signed_document_data"),   // base64
  signedDocumentName: text("signed_document_name"),
  valor: real("valor"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Garantias ────────────────────────────────────────────────────────────────
export const warranties = pgTable("warranties", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id"),
  jobId: integer("job_id"),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  serviceType: text("service_type").notNull(),
  warrantyMonths: integer("warranty_months").notNull().default(12),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").notNull().default("ativa"), // ativa | vencida | acionada | cancelada
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const warrantyIncidents = pgTable("warranty_incidents", {
  id: serial("id").primaryKey(),
  warrantyId: integer("warranty_id").notNull(),
  description: text("description").notNull(),
  cost: real("cost").default(0),
  technicianName: text("technician_name"),
  resolvedAt: text("resolved_at"),
  status: text("status").notNull().default("aberta"), // aberta | resolvida
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Produção / Equipe ────────────────────────────────────────────────────────
export const productionLogs = pgTable("production_logs", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id"),
  jobId: integer("job_id"),
  clientName: text("client_name"),
  technicianName: text("technician_name").notNull(),
  userId: integer("user_id"),
  date: text("date").notNull(),
  hoursWorked: real("hours_worked").default(0),
  squareMeters: real("square_meters").default(0),
  serviceType: text("service_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Pós-Venda e NPS ──────────────────────────────────────────────────────────
export const npsResponses = pgTable("nps_responses", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id"),
  jobId: integer("job_id"),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  sentAt: timestamp("sent_at"),
  respondedAt: timestamp("responded_at"),
  score: integer("score"),
  comment: text("comment"),
  status: text("status").notNull().default("pendente"), // pendente | respondido
  createdAt: timestamp("created_at").defaultNow(),
});

export const maintenanceReminders = pgTable("maintenance_reminders", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id"),
  jobId: integer("job_id"),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  serviceType: text("service_type"),
  completedDate: text("completed_date").notNull(),
  reminder12SentAt: timestamp("reminder_12_sent_at"),
  reminder24SentAt: timestamp("reminder_24_sent_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: real("value").notNull(),
});

// ─── WhatsApp Flows & Logs ────────────────────────────────────────────────────
export const whatsappFlows = pgTable("whatsapp_flows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(), // 'orcamento_enviado'|'orcamento_aprovado'|'followup_2d'|'followup_5d'|'obra_finalizada'|'manutencao_12m'|'atendimento_inicial'
  triggerValue: text("trigger_value"), // extra param (e.g. status name)
  message: text("message").notNull(),
  messageType: text("message_type").notNull().default("text"), // 'text' | 'buttons'
  buttons: text("buttons"), // JSON: [{id, text, responseMessage}]
  includePdf: boolean("include_pdf").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const whatsappSendLogs = pgTable("whatsapp_send_logs", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id"),
  flowName: text("flow_name"),
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("sent"), // 'sent' | 'error'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── WhatsApp Templates (Biblioteca de Mensagens) ─────────────────────────────
export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("geral"), // atendimento|orcamento|followup|obra|manutencao|geral
  message: text("message").notNull(),
  variables: text("variables"), // comma-separated list of variables used
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplates).omit({ id: true, createdAt: true });
export type InsertWhatsappTemplate = typeof insertWhatsappTemplateSchema._type;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;

// ─── Quote PDF Templates ──────────────────────────────────────────────────────
export const quoteTemplates = pgTable("quote_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  config: text("config").notNull(), // JSON string with all layout settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertQuoteTemplateSchema = createInsertSchema(quoteTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuoteTemplate = typeof insertQuoteTemplateSchema._type;
export type QuoteTemplate = typeof quoteTemplates.$inferSelect;

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true, createdAt: true });
export const insertPaymentConditionSchema = createInsertSchema(paymentConditions).omit({ id: true, createdAt: true });
export const insertObraRegistroSchema = createInsertSchema(obraRegistros).omit({ id: true, createdAt: true, updatedAt: true });

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
// Job Statuses — custom statuses with WhatsApp messages
export const jobStatuses = pgTable("job_statuses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  message: text("message").notNull().default(""),
  includePdf: boolean("include_pdf").default(true),
  extraFileName: text("extra_file_name"),   // original filename
  extraFileData: text("extra_file_data"),   // base64 data URL
  sortOrder: integer("sort_order").default(0),
  generateOs: boolean("generate_os").default(false), // auto-create Work Order when this status is set
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertJobStatusSchema = createInsertSchema(jobStatuses).omit({ id: true, createdAt: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true });

// ─── Obra Consumo Logs — per-user material consumption records ───────────────
export const obraConsumoLogs = pgTable("obra_consumo_logs", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").notNull(),
  serviceName: text("service_name").notNull(),
  materialName: text("material_name").notNull(),
  inventoryId: integer("inventory_id"),
  quantity: integer("quantity").notNull(), // always ceiled integer
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertObraConsumoLogSchema = createInsertSchema(obraConsumoLogs).omit({ id: true, createdAt: true });

// ─── Controle de Materiais — Saídas e Retornos ────────────────────────────────
export const materialWithdrawals = pgTable("material_withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
  workOrderId: integer("work_order_id"),
  jobId: integer("job_id"),
  clientName: text("client_name"),
  status: text("status").notNull().default("pendente"), // pendente | retornado | parcial
  withdrawalPhoto: text("withdrawal_photo"),   // base64
  withdrawalSignature: text("withdrawal_signature"), // base64
  returnPhoto: text("return_photo"),           // base64
  returnSignature: text("return_signature"),   // base64
  notes: text("notes"),
  returnNotes: text("return_notes"),
  returnedAt: timestamp("returned_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const materialWithdrawalItems = pgTable("material_withdrawal_items", {
  id: serial("id").primaryKey(),
  withdrawalId: integer("withdrawal_id").notNull(),
  inventoryId: integer("inventory_id").notNull(),
  productName: text("product_name").notNull(),
  unit: text("unit").notNull().default("unid"),
  quantity: integer("quantity").notNull(),
  returnedQuantity: integer("returned_quantity"),
  condition: text("condition"), // bom | danificado | perdido
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMaterialWithdrawalSchema = createInsertSchema(materialWithdrawals).omit({ id: true, createdAt: true, returnedAt: true });
export const insertMaterialWithdrawalItemSchema = createInsertSchema(materialWithdrawalItems).omit({ id: true, createdAt: true });

export type MaterialWithdrawal = typeof materialWithdrawals.$inferSelect;
export type MaterialWithdrawalItem = typeof materialWithdrawalItems.$inferSelect;
export type InsertMaterialWithdrawal = typeof insertMaterialWithdrawalSchema._type;
export type InsertMaterialWithdrawalItem = typeof insertMaterialWithdrawalItemSchema._type;

// ─── Regras de Desconto Salarial ──────────────────────────────────────────────
export const salaryDiscountRules = pgTable("salary_discount_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  condition: text("condition").notNull(),      // 'perdido' | 'danificado'
  discountType: text("discount_type").notNull().default("percent"), // 'percent' | 'fixed'
  discountValue: real("discount_value").notNull().default(100),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salaryDiscounts = pgTable("salary_discounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
  withdrawalId: integer("withdrawal_id").notNull(),
  withdrawalItemId: integer("withdrawal_item_id").notNull(),
  productName: text("product_name").notNull(),
  condition: text("condition").notNull(),
  ruleId: integer("rule_id"),
  ruleName: text("rule_name"),
  discountAmount: real("discount_amount").notNull().default(0),
  status: text("status").notNull().default("pendente"), // pendente | aprovado | rejeitado
  notes: text("notes"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSalaryDiscountRuleSchema = createInsertSchema(salaryDiscountRules).omit({ id: true, createdAt: true });
export const insertSalaryDiscountSchema = createInsertSchema(salaryDiscounts).omit({ id: true, createdAt: true, approvedAt: true });

export type SalaryDiscountRule = typeof salaryDiscountRules.$inferSelect;
export type SalaryDiscount = typeof salaryDiscounts.$inferSelect;
export type InsertSalaryDiscountRule = typeof insertSalaryDiscountRuleSchema._type;
export type InsertSalaryDiscount = typeof insertSalaryDiscountSchema._type;
export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({ id: true, createdAt: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true });
export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertJobTrackingSchema = createInsertSchema(jobTracking).omit({ id: true, createdAt: true });
export const insertPriorityRulesSchema = createInsertSchema(priorityRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, date: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });
export const insertCostConfigSchema = createInsertSchema(costConfig).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertJobTracking = z.infer<typeof insertJobTrackingSchema>;
export type InsertPriorityRules = z.infer<typeof insertPriorityRulesSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type WorkOrder = typeof workOrders.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Product = typeof products.$inferSelect;
export type JobTracking = typeof jobTracking.$inferSelect;
export type PriorityRules = typeof priorityRules.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type InsertCostConfig = z.infer<typeof insertCostConfigSchema>;
export type CostConfig = typeof costConfig.$inferSelect;

export type InsertObraRegistro = z.infer<typeof insertObraRegistroSchema>;
export type ObraRegistro = typeof obraRegistros.$inferSelect;

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

export type InsertPaymentCondition = z.infer<typeof insertPaymentConditionSchema>;
export type PaymentCondition = typeof paymentConditions.$inferSelect;

export type InsertJobStatus = z.infer<typeof insertJobStatusSchema>;
export type JobStatus = typeof jobStatuses.$inferSelect;

export type InsertObraConsumoLog = z.infer<typeof insertObraConsumoLogSchema>;
export type ObraConsumoLog = typeof obraConsumoLogs.$inferSelect;

// ─── New module insert schemas ────────────────────────────────────────────────
export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true });
export const insertWarrantySchema = createInsertSchema(warranties).omit({ id: true, createdAt: true });
export const insertWarrantyIncidentSchema = createInsertSchema(warrantyIncidents).omit({ id: true, createdAt: true });
export const insertProductionLogSchema = createInsertSchema(productionLogs).omit({ id: true, createdAt: true });
export const insertNpsResponseSchema = createInsertSchema(npsResponses).omit({ id: true, createdAt: true });
export const insertMaintenanceReminderSchema = createInsertSchema(maintenanceReminders).omit({ id: true, createdAt: true });

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export type InsertWarranty = z.infer<typeof insertWarrantySchema>;
export type Warranty = typeof warranties.$inferSelect;

export type InsertWarrantyIncident = z.infer<typeof insertWarrantyIncidentSchema>;
export type WarrantyIncident = typeof warrantyIncidents.$inferSelect;

export type InsertProductionLog = z.infer<typeof insertProductionLogSchema>;
export type ProductionLog = typeof productionLogs.$inferSelect;

export type InsertNpsResponse = z.infer<typeof insertNpsResponseSchema>;
export type NpsResponse = typeof npsResponses.$inferSelect;

export type InsertMaintenanceReminder = z.infer<typeof insertMaintenanceReminderSchema>;
export type MaintenanceReminder = typeof maintenanceReminders.$inferSelect;

export const insertWhatsappFlowSchema = createInsertSchema(whatsappFlows).omit({ id: true, createdAt: true });
export type InsertWhatsappFlow = z.infer<typeof insertWhatsappFlowSchema>;
export type WhatsappFlow = typeof whatsappFlows.$inferSelect;

export const insertWhatsappSendLogSchema = createInsertSchema(whatsappSendLogs).omit({ id: true, createdAt: true });
export type InsertWhatsappSendLog = z.infer<typeof insertWhatsappSendLogSchema>;
export type WhatsappSendLog = typeof whatsappSendLogs.$inferSelect;

export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;
