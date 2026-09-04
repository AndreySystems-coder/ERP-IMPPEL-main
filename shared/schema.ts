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
  fullName: text("full_name"),
  birthDate: text("birth_date"),
  status: text("status").notNull().default('ativo'),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
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
  email: text("email"),
  company: text("company"),
  document: text("document"),
  city: text("city"),
  address: text("address"),
  source: text("source"),
  status: text("status").notNull().default("New Lead"),
  serviceInterest: text("service_interest"),
  problemDescription: text("problem_description"),
  approximateArea: real("approximate_area"),
  urgency: text("urgency"),
  campaign: text("campaign"),
  assignedToUsername: text("assigned_to_username"),
  priority: text("priority").default("normal"),
  lastInteractionAt: timestamp("last_interaction_at"),
  nextAction: text("next_action"),
  lossReason: text("loss_reason"),
  lossNotes: text("loss_notes"),
  postponedReason: text("postponed_reason"),
  qualificationData: text("qualification_data"),
  sufficientInfo: boolean("sufficient_info").default(false),
  stageEnteredAt: timestamp("stage_entered_at"),
  history: text("history").default("[]"),
  notes: text("notes"),
  nextContactDate: timestamp("next_contact_date"),
  statusLocked: boolean("status_locked").notNull().default(false),
  currentFlowTrigger: text("current_flow_trigger"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  pricingSnapshot: text("pricing_snapshot"), // JSON: parametros financeiros usados no orçamento

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
  refusalReason: text("refusal_reason"), // Motivo quando status = "Recusado"
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
  // Explicit override for retornavel/consumivel; null falls back to the name-based guess in shared/materialReturnPolicy.ts
  returnPolicy: text("return_policy"),
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
  competenceDate: timestamp("competence_date"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  status: text("status").notNull().default("realized"), // planned | pending | partial | paid | received | overdue | canceled | realized
  paymentMethod: text("payment_method"),
  clientName: text("client_name"),
  supplierName: text("supplier_name"),
  jobId: integer("job_id"),
  workOrderId: integer("work_order_id"),
  installment: text("installment"),
  recurrence: text("recurrence"),
  notes: text("notes"),
  attachmentUrl: text("attachment_url"),
  responsibleUserId: integer("responsible_user_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const materialSales = pgTable("material_sales", {
  id: serial("id").primaryKey(),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdByUsername: text("created_by_username").notNull(),
  buyerName: text("buyer_name").notNull(),
  buyerPhone: text("buyer_phone"),
  notes: text("notes"),
  items: text("items").notNull(), // JSON snapshot of products, quantities, prices and discounts
  subtotal: real("subtotal").notNull(),
  discountAmount: real("discount_amount").notNull().default(0),
  total: real("total").notNull(),
  status: text("status").notNull().default("pendente"), // pendente | aprovada | rejeitada
  approvedByUserId: integer("approved_by_user_id"),
  approvedByUsername: text("approved_by_username"),
  approvedAt: timestamp("approved_at"),
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
  monthlyFixedCosts: real("monthly_fixed_costs").notNull().default(35382.71),
  proLabore: real("pro_labore").notNull().default(10000),
  averageMonthlyRevenue: real("average_monthly_revenue").notNull().default(333000),
  totalDebt: real("total_debt").notNull().default(878451.77),
  hiddenCostPercent: real("hidden_cost_percent").notNull().default(0.05),
  taxPercent: real("tax_percent").notNull().default(0),
  minMarginPercent: real("min_margin_percent").notNull().default(0.30),
  idealMarginPercent: real("ideal_margin_percent").notNull().default(0.40),
  alertMarginPercent: real("alert_margin_percent").notNull().default(0.30),
  prohibitedMarginPercent: real("prohibited_margin_percent").notNull().default(0.25),
  minimumServiceValue: real("minimum_service_value").notNull().default(1000),
  roundingMode: text("rounding_mode").notNull().default("centavos"),
  effectiveDate: timestamp("effective_date").defaultNow(),
  updatedBy: text("updated_by"),
  changeHistory: text("change_history").default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commercialPolicies = pgTable("commercial_policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // desconto | comissao | logistica | pagamento | alcada | margem
  status: text("status").notNull().default("rascunho"), // rascunho | ativo | arquivado
  rules: text("rules").notNull().default("{}"),
  approvalLevels: text("approval_levels").notNull().default("[]"),
  notes: text("notes"),
  effectiveDate: timestamp("effective_date").defaultNow(),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  updatedByUserId: integer("updated_by_user_id"),
  updatedByUsername: text("updated_by_username"),
  auditTrail: text("audit_trail").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const discountRequests = pgTable("discount_requests", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  quoteVersionId: integer("quote_version_id"),
  requestedByUserId: integer("requested_by_user_id").notNull(),
  requestedByUsername: text("requested_by_username").notNull(),
  approvedByUserId: integer("approved_by_user_id"),
  approvedByUsername: text("approved_by_username"),
  status: text("status").notNull().default("pendente"),
  originalPrice: real("original_price").notNull().default(0),
  requestedPrice: real("requested_price").notNull().default(0),
  discountPercent: real("discount_percent").notNull().default(0),
  discountAmount: real("discount_amount").notNull().default(0),
  marginBefore: real("margin_before").notNull().default(0),
  marginAfter: real("margin_after").notNull().default(0),
  reason: text("reason").notNull(),
  notes: text("notes"),
  expiresAt: timestamp("expires_at"),
  decisionNotes: text("decision_notes"),
  decidedAt: timestamp("decided_at"),
  auditTrail: text("audit_trail").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commissionRecords = pgTable("commission_records", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  paymentId: integer("payment_id"),
  userId: integer("user_id"),
  username: text("username"),
  policyId: integer("policy_id"),
  status: text("status").notNull().default("prevista"),
  baseAmount: real("base_amount").notNull().default(0),
  percent: real("percent").notNull().default(0),
  fixedAmount: real("fixed_amount").notNull().default(0),
  commissionAmount: real("commission_amount").notNull().default(0),
  releasedAmount: real("released_amount").notNull().default(0),
  paidAmount: real("paid_amount").notNull().default(0),
  notes: text("notes"),
  auditTrail: text("audit_trail").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const logisticsRecords = pgTable("logistics_records", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id"),
  workOrderId: integer("work_order_id"),
  distanceKm: real("distance_km").notNull().default(0),
  trips: integer("trips").notNull().default(1),
  costPerKm: real("cost_per_km").notNull().default(0),
  tolls: real("tolls").notNull().default(0),
  parking: real("parking").notNull().default(0),
  meals: real("meals").notNull().default(0),
  lodging: real("lodging").notNull().default(0),
  otherCosts: real("other_costs").notNull().default(0),
  totalCost: real("total_cost").notNull().default(0),
  manualAdjustmentReason: text("manual_adjustment_reason"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  auditTrail: text("audit_trail").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const quoteVersions = pgTable("quote_versions", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  versionNumber: integer("version_number").notNull().default(1),
  status: text("status").notNull().default("rascunho"),
  scopeIncluded: text("scope_included").notNull().default("[]"),
  scopeExcluded: text("scope_excluded").notNull().default("[]"),
  assumptions: text("assumptions").notNull().default("[]"),
  pricingSnapshot: text("pricing_snapshot"),
  acceptedByClientAt: timestamp("accepted_by_client_at"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  auditTrail: text("audit_trail").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const crmPipelineStatuses = pgTable("crm_pipeline_statuses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  color: text("color"),
  isActive: boolean("is_active").notNull().default(true),
  requiresLossReason: boolean("requires_loss_reason").notNull().default(false),
  requiresNextAction: boolean("requires_next_action").notNull().default(false),
  isWon: boolean("is_won").notNull().default(false),
  isLost: boolean("is_lost").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const crmFollowUps = pgTable("crm_followups", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id"),
  jobId: integer("job_id"),
  status: text("status").notNull().default("pendente"),
  reason: text("reason"),
  messageTemplate: text("message_template"),
  assignedToUsername: text("assigned_to_username"),
  dueDate: timestamp("due_date").notNull(),
  completedAt: timestamp("completed_at"),
  result: text("result"),
  channel: text("channel").notNull().default("manual"),
  externalProvider: text("external_provider"),
  externalMessageId: text("external_message_id"),
  auditTrail: text("audit_trail").default("[]"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const crmInteractions = pgTable("crm_interactions", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id"),
  jobId: integer("job_id"),
  channel: text("channel").notNull().default("manual"),
  direction: text("direction").notNull().default("outbound"),
  summary: text("summary").notNull(),
  status: text("status"),
  externalProvider: text("external_provider"),
  externalMessageId: text("external_message_id"),
  occurredAt: timestamp("occurred_at").defaultNow(),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scopeChangeRequests = pgTable("scope_change_requests", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  workOrderId: integer("work_order_id"),
  quoteVersionId: integer("quote_version_id"),
  type: text("type").notNull().default("aditivo"),
  status: text("status").notNull().default("pendente"),
  description: text("description").notNull(),
  materialImpact: text("material_impact").notNull().default("[]"),
  scheduleImpact: text("schedule_impact"),
  financialImpact: real("financial_impact").notNull().default(0),
  marginAfter: real("margin_after").notNull().default(0),
  requestedByUserId: integer("requested_by_user_id"),
  requestedByUsername: text("requested_by_username"),
  approvedByUserId: integer("approved_by_user_id"),
  approvedByUsername: text("approved_by_username"),
  decisionNotes: text("decision_notes"),
  decidedAt: timestamp("decided_at"),
  auditTrail: text("audit_trail").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const technicalProcedures = pgTable("technical_procedures", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  serviceId: integer("service_id"),
  serviceName: text("service_name"),
  version: text("version").notNull().default("1.0"),
  status: text("status").notNull().default("rascunho"),
  objective: text("objective"),
  indication: text("indication"),
  contraindication: text("contraindication"),
  materials: text("materials").notNull().default("[]"),
  tools: text("tools").notNull().default("[]"),
  equipment: text("equipment").notNull().default("[]"),
  epis: text("epis").notNull().default("[]"),
  preparation: text("preparation"),
  execution: text("execution"),
  curing: text("curing"),
  protection: text("protection"),
  tests: text("tests"),
  acceptanceCriteria: text("acceptance_criteria"),
  criticalPoints: text("critical_points"),
  commonFailures: text("common_failures"),
  exceptionProcedure: text("exception_procedure"),
  references: text("references").notNull().default("[]"),
  attachments: text("attachments").notNull().default("[]"),
  trainingMedia: text("training_media").notNull().default("[]"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  approvedByUserId: integer("approved_by_user_id"),
  approvedByUsername: text("approved_by_username"),
  approvedAt: timestamp("approved_at"),
  effectiveDate: timestamp("effective_date"),
  auditTrail: text("audit_trail").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const checklistTemplates = pgTable("checklist_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  serviceId: integer("service_id"),
  serviceName: text("service_name"),
  procedureId: integer("procedure_id"),
  phase: text("phase").notNull().default("Planejamento"),
  version: text("version").notNull().default("1.0"),
  status: text("status").notNull().default("rascunho"),
  items: text("items").notNull().default("[]"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  approvedByUserId: integer("approved_by_user_id"),
  approvedByUsername: text("approved_by_username"),
  approvedAt: timestamp("approved_at"),
  auditTrail: text("audit_trail").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workOrderQualityRuns = pgTable("work_order_quality_runs", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").notNull(),
  jobId: integer("job_id"),
  procedureId: integer("procedure_id"),
  procedureVersion: text("procedure_version"),
  checklistTemplateId: integer("checklist_template_id"),
  phase: text("phase").notNull().default("Planejamento"),
  status: text("status").notNull().default("pendente"),
  responses: text("responses").notNull().default("{}"),
  requiredItemsTotal: integer("required_items_total").notNull().default(0),
  requiredItemsDone: integer("required_items_done").notNull().default(0),
  blockingOpenCount: integer("blocking_open_count").notNull().default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  completedByUserId: integer("completed_by_user_id"),
  completedByUsername: text("completed_by_username"),
  auditTrail: text("audit_trail").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const qualityEvents = pgTable("quality_events", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").notNull(),
  jobId: integer("job_id"),
  serviceName: text("service_name"),
  phase: text("phase").notNull().default("Execução"),
  type: text("type").notNull(),
  severity: text("severity").notNull().default("normal"),
  status: text("status").notNull().default("aberta"),
  description: text("description").notNull(),
  impactTechnical: text("impact_technical"),
  impactFinancial: real("impact_financial").notNull().default(0),
  impactSchedule: text("impact_schedule"),
  correctiveAction: text("corrective_action"),
  resolution: text("resolution"),
  photos: text("photos").notNull().default("[]"),
  evidence: text("evidence").notNull().default("[]"),
  assignedToUserId: integer("assigned_to_user_id"),
  assignedToUsername: text("assigned_to_username"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  resolvedByUserId: integer("resolved_by_user_id"),
  resolvedByUsername: text("resolved_by_username"),
  resolvedAt: timestamp("resolved_at"),
  auditTrail: text("audit_trail").notNull().default("[]"),
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
  workOrderId: integer("work_order_id"),
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
  channel: text("channel").notNull().default("manual"), // 'manual' (wa.me) | 'n8n' (automático)
  direction: text("direction").notNull().default("saida"), // 'saida' | 'entrada' (resposta do cliente via n8n)
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Automação (n8n) ──────────────────────────────────────────────────────────
export const automationSettings = pgTable("automation_settings", {
  id: serial("id").primaryKey(),
  n8nWebhookUrl: text("n8n_webhook_url"),
  incomingSecret: text("incoming_secret"),
  whatsappAutoSendEnabled: boolean("whatsapp_auto_send_enabled").notNull().default(false),
  evolutionApiUrl: text("evolution_api_url"),
  evolutionApiKey: text("evolution_api_key"),
  evolutionInstanceName: text("evolution_instance_name").default("imppel"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AutomationSettings = typeof automationSettings.$inferSelect;

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
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
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
  color: text("color"), // cor customizável exibida nos badges de status; null usa o mapa padrão do código
  autoSendWhatsapp: boolean("auto_send_whatsapp").notNull().default(false), // envia `message` automaticamente via n8n ao entrar neste status
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertJobStatusSchema = createInsertSchema(jobStatuses).omit({ id: true, createdAt: true });

// Work Order Statuses — mesmo conceito de jobStatuses, mas para o funil de Obras (que não tinha
// tabela própria: os status eram strings fixas em client/src/features/work-orders/constants.ts).
export const workOrderStatuses = pgTable("work_order_statuses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  message: text("message").notNull().default(""),
  color: text("color"),
  sortOrder: integer("sort_order").default(0),
  autoSendWhatsapp: boolean("auto_send_whatsapp").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkOrderStatusSchema = createInsertSchema(workOrderStatuses).omit({ id: true, createdAt: true });
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
  withdrawalDate: text("withdrawal_date"),
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
  condition: text("condition"), // bom | danificado | perdido | manutencao
  createdAt: timestamp("created_at").defaultNow(),
});

export const materialCustodyTransfers = pgTable("material_custody_transfers", {
  id: serial("id").primaryKey(),
  withdrawalId: integer("withdrawal_id"),
  withdrawalItemId: integer("withdrawal_item_id"),
  inventoryId: integer("inventory_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unit: text("unit").notNull().default("unid"),
  previousUserId: integer("previous_user_id"),
  previousUsername: text("previous_username"),
  newUserId: integer("new_user_id").notNull(),
  newUsername: text("new_username").notNull(),
  workOrderId: integer("work_order_id"),
  reason: text("reason"),
  condition: text("condition").notNull().default("bom"),
  evidencePhoto: text("evidence_photo"),
  acceptedAt: timestamp("accepted_at"),
  acceptedByUserId: integer("accepted_by_user_id"),
  acceptedByUsername: text("accepted_by_username"),
  status: text("status").notNull().default("pendente"), // pendente | aceito | rejeitado | cancelado
  auditTrail: text("audit_trail"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const materialResponsibilityCases = pgTable("material_responsibility_cases", {
  id: serial("id").primaryKey(),
  withdrawalId: integer("withdrawal_id"),
  withdrawalItemId: integer("withdrawal_item_id"),
  inventoryId: integer("inventory_id"),
  productName: text("product_name").notNull(),
  workOrderId: integer("work_order_id"),
  jobId: integer("job_id"),
  userId: integer("user_id"),
  username: text("username"),
  type: text("type").notNull(), // dano | perda | manutencao | divergencia | atraso | sobra | outro
  severity: text("severity").notNull().default("administrativa"), // informativa | administrativa | bloqueante
  status: text("status").notNull().default("aberta"), // aberta | aguardando_manifestacao | em_analise | aprovada_administrativamente | rejeitada | concluida | cancelada
  description: text("description").notNull(),
  evidence: text("evidence"),
  estimatedValue: real("estimated_value").notNull().default(0),
  employeeStatement: text("employee_statement"),
  analysis: text("analysis"),
  decision: text("decision"),
  financialStatus: text("financial_status").notNull().default("sem_providencia_financeira"),
  approvedByUserId: integer("approved_by_user_id"),
  approvedByUsername: text("approved_by_username"),
  approvedAt: timestamp("approved_at"),
  auditTrail: text("audit_trail"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const materialKits = pgTable("material_kits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("funcao"), // funcao | individual | equipe
  roleName: text("role_name"),
  assignedUserId: integer("assigned_user_id"),
  assignedUsername: text("assigned_username"),
  status: text("status").notNull().default("rascunho"),
  notes: text("notes"),
  auditTrail: text("audit_trail"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const materialKitItems = pgTable("material_kit_items", {
  id: serial("id").primaryKey(),
  kitId: integer("kit_id").notNull(),
  inventoryId: integer("inventory_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  required: boolean("required").notNull().default(true),
  replacementPolicy: text("replacement_policy"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const toolMaintenanceRecords = pgTable("tool_maintenance_records", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").notNull(),
  productName: text("product_name").notNull(),
  withdrawalId: integer("withdrawal_id"),
  status: text("status").notNull().default("aberta"), // aberta | em_manutencao | aguardando_retorno | concluida | cancelada
  maintenanceType: text("maintenance_type").notNull().default("corretiva"),
  defectDescription: text("defect_description"),
  provider: text("provider"),
  estimatedCost: real("estimated_cost").notNull().default(0),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  finalCondition: text("final_condition"),
  photos: text("photos"),
  releasedByUserId: integer("released_by_user_id"),
  releasedByUsername: text("released_by_username"),
  auditTrail: text("audit_trail"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const materialCountAudits = pgTable("material_count_audits", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").notNull(),
  productName: text("product_name").notNull(),
  systemQuantity: integer("system_quantity").notNull(),
  physicalQuantity: integer("physical_quantity").notNull(),
  difference: integer("difference").notNull(),
  reason: text("reason").notNull(),
  evidence: text("evidence"),
  status: text("status").notNull().default("pendente"), // pendente | aprovado | rejeitado | ajustado
  approvedByUserId: integer("approved_by_user_id"),
  approvedByUsername: text("approved_by_username"),
  approvedAt: timestamp("approved_at"),
  auditTrail: text("audit_trail"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const materialTrainingGuides = pgTable("material_training_guides", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("controle_materiais"),
  version: text("version").notNull().default("1.0"),
  status: text("status").notNull().default("rascunho"),
  content: text("content").notNull(),
  media: text("media"),
  approvedByUserId: integer("approved_by_user_id"),
  approvedByUsername: text("approved_by_username"),
  approvedAt: timestamp("approved_at"),
  auditTrail: text("audit_trail"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMaterialWithdrawalSchema = createInsertSchema(materialWithdrawals).omit({ id: true, createdAt: true, returnedAt: true });
export const insertMaterialWithdrawalItemSchema = createInsertSchema(materialWithdrawalItems).omit({ id: true, createdAt: true });

export const mobileImportAliases = pgTable("mobile_import_aliases", {
  id: serial("id").primaryKey(),
  alias: text("alias").notNull().unique(),
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mobileImportHistory = pgTable("mobile_import_history", {
  id: serial("id").primaryKey(),
  hash: text("hash").notNull().unique(),
  importedByUserId: integer("imported_by_user_id").notNull(),
  importedByUsername: text("imported_by_username").notNull(),
  sourceText: text("source_text").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull().default("aplicado"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMobileImportAliasSchema = createInsertSchema(mobileImportAliases).omit({ id: true, createdAt: true });
export const insertMobileImportHistorySchema = createInsertSchema(mobileImportHistory).omit({ id: true, createdAt: true });

export type MaterialWithdrawal = typeof materialWithdrawals.$inferSelect;
export type MaterialWithdrawalItem = typeof materialWithdrawalItems.$inferSelect;
export type MaterialCustodyTransfer = typeof materialCustodyTransfers.$inferSelect;
export type MaterialResponsibilityCase = typeof materialResponsibilityCases.$inferSelect;
export type MaterialKit = typeof materialKits.$inferSelect;
export type MaterialKitItem = typeof materialKitItems.$inferSelect;
export type ToolMaintenanceRecord = typeof toolMaintenanceRecords.$inferSelect;
export type MaterialCountAudit = typeof materialCountAudits.$inferSelect;
export type MaterialTrainingGuide = typeof materialTrainingGuides.$inferSelect;
export type InsertMaterialWithdrawal = typeof insertMaterialWithdrawalSchema._type;
export type InsertMaterialWithdrawalItem = typeof insertMaterialWithdrawalItemSchema._type;
export type MobileImportAlias = typeof mobileImportAliases.$inferSelect;
export type InsertMobileImportAlias = typeof insertMobileImportAliasSchema._type;
export type MobileImportHistory = typeof mobileImportHistory.$inferSelect;
export type InsertMobileImportHistory = typeof insertMobileImportHistorySchema._type;

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

export const marketingContentPlans = pgTable("marketing_content_plans", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  idea: text("idea"),
  category: text("category"),
  channel: text("channel").notNull().default("Instagram"),
  objective: text("objective"),
  serviceName: text("service_name"),
  workOrderId: integer("work_order_id"),
  captionDraft: text("caption_draft"),
  cta: text("cta"),
  media: text("media"),
  status: text("status").notNull().default("ideia"),
  assignedToUsername: text("assigned_to_username"),
  plannedAt: timestamp("planned_at"),
  publishedAt: timestamp("published_at"),
  publishedUrl: text("published_url"),
  resultNotes: text("result_notes"),
  aiPrompt: text("ai_prompt"),
  auditTrail: text("audit_trail").default("[]"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const helpArticles = pgTable("help_articles", {
  id: serial("id").primaryKey(),
  moduleKey: text("module_key").notNull(),
  title: text("title").notNull(),
  audience: text("audience"),
  roleName: text("role_name"),
  summary: text("summary"),
  steps: text("steps").default("[]"),
  commonErrors: text("common_errors").default("[]"),
  relatedModules: text("related_modules").default("[]"),
  routePath: text("route_path"),
  status: text("status").notNull().default("ativo"),
  version: integer("version").notNull().default(1),
  media: text("media").default("[]"),
  requiresAcknowledgement: boolean("requires_acknowledgement").notNull().default(false),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  approvedByUserId: integer("approved_by_user_id"),
  approvedByUsername: text("approved_by_username"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const visualBrandKits = pgTable("visual_brand_kits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("IMPP_EL Visual Kit"),
  brandName: text("brand_name").notNull().default("IMPP_EL"),
  primaryLogo: text("primary_logo"),
  alternateLogo: text("alternate_logo"),
  lightLogo: text("light_logo"),
  darkLogo: text("dark_logo"),
  symbol: text("symbol"),
  watermark: text("watermark"),
  primaryColor: text("primary_color").notNull().default("#0f766e"),
  secondaryColor: text("secondary_color").notNull().default("#1d4ed8"),
  backgroundColor: text("background_color").notNull().default("#ffffff"),
  typography: text("typography").notNull().default("Fonte do ERP"),
  toneOfVoice: text("tone_of_voice").default("Profissional, direto e tecnico"),
  slogan: text("slogan"),
  institutionalData: text("institutional_data").default("{}"),
  contacts: text("contacts").default("{}"),
  rules: text("rules").default("[]"),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("rascunho"),
  approvedByUsername: text("approved_by_username"),
  validFrom: timestamp("valid_from"),
  auditTrail: text("audit_trail").default("[]"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const visualMediaStandards = pgTable("visual_media_standards", {
  id: serial("id").primaryKey(),
  mediaType: text("media_type").notNull().default("foto"),
  purpose: text("purpose").notNull(),
  phase: text("phase"),
  minQuantity: integer("min_quantity").notNull().default(0),
  orientation: text("orientation").notNull().default("qualquer"),
  aspectRatio: text("aspect_ratio"),
  recommendedWidth: integer("recommended_width"),
  recommendedHeight: integer("recommended_height"),
  minResolution: text("min_resolution"),
  quality: text("quality"),
  durationSeconds: integer("duration_seconds"),
  instructions: text("instructions").default("[]"),
  requiredPoints: text("required_points").default("[]"),
  correctExample: text("correct_example"),
  incorrectExample: text("incorrect_example"),
  needsWatermark: boolean("needs_watermark").notNull().default(false),
  requiresAuthorization: boolean("requires_authorization").notNull().default(false),
  destination: text("destination"),
  captionTemplate: text("caption_template"),
  status: text("status").notNull().default("rascunho"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const visualMediaAuthorizations = pgTable("visual_media_authorizations", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  clientName: text("client_name").notNull(),
  workOrderId: integer("work_order_id"),
  authorizationType: text("authorization_type").notNull().default("imagem"),
  allowedImages: text("allowed_images").default("[]"),
  allowedChannels: text("allowed_channels").default("[]"),
  purpose: text("purpose"),
  documentData: text("document_data"),
  restrictions: text("restrictions"),
  status: text("status").notNull().default("nao_solicitado"),
  revokedAt: timestamp("revoked_at"),
  responsibleUsername: text("responsible_username"),
  auditTrail: text("audit_trail").default("[]"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const visualAssets = pgTable("visual_assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  assetType: text("asset_type").notNull().default("imagem"),
  source: text("source").notNull().default("upload"),
  originalData: text("original_data"),
  thumbnailData: text("thumbnail_data"),
  derivedData: text("derived_data"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size").notNull().default(0),
  checksum: text("checksum"),
  clientId: integer("client_id"),
  workOrderId: integer("work_order_id"),
  serviceName: text("service_name"),
  phase: text("phase"),
  purpose: text("purpose"),
  authorizationId: integer("authorization_id"),
  authorizationStatus: text("authorization_status").notNull().default("nao_solicitado"),
  tags: text("tags").default("[]"),
  status: text("status").notNull().default("rascunho"),
  processingStatus: text("processing_status").notNull().default("pendente"),
  processingNotes: text("processing_notes"),
  metadata: text("metadata").default("{}"),
  auditTrail: text("audit_trail").default("[]"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const visualTemplates = pgTable("visual_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  templateType: text("template_type").notNull(),
  channel: text("channel"),
  format: text("format"),
  brandKitId: integer("brand_kit_id"),
  config: text("config").notNull().default("{}"),
  textTemplate: text("text_template"),
  status: text("status").notNull().default("rascunho"),
  version: integer("version").notNull().default(1),
  approvedByUsername: text("approved_by_username"),
  auditTrail: text("audit_trail").default("[]"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const visualCompositions = pgTable("visual_compositions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  compositionType: text("composition_type").notNull().default("antes_depois"),
  beforeAssetId: integer("before_asset_id"),
  afterAssetId: integer("after_asset_id"),
  templateId: integer("template_id"),
  brandKitId: integer("brand_kit_id"),
  workOrderId: integer("work_order_id"),
  clientId: integer("client_id"),
  serviceName: text("service_name"),
  format: text("format").notNull().default("whatsapp"),
  caption: text("caption"),
  outputData: text("output_data"),
  authorizationStatus: text("authorization_status").notNull().default("nao_solicitado"),
  status: text("status").notNull().default("rascunho"),
  auditTrail: text("audit_trail").default("[]"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const materialReturnPolicyAudits = pgTable("material_return_policy_audits", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").notNull(),
  productName: text("product_name").notNull(),
  previousType: text("previous_type"),
  newType: text("new_type"),
  previousPolicy: text("previous_policy").notNull(),
  newPolicy: text("new_policy").notNull(),
  reason: text("reason").notNull(),
  impactSummary: text("impact_summary"),
  status: text("status").notNull().default("aplicado"),
  createdByUserId: integer("created_by_user_id"),
  createdByUsername: text("created_by_username"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSalaryDiscountRuleSchema = createInsertSchema(salaryDiscountRules).omit({ id: true, createdAt: true });
export const insertSalaryDiscountSchema = createInsertSchema(salaryDiscounts).omit({ id: true, createdAt: true, approvedAt: true });
export const insertCrmPipelineStatusSchema = createInsertSchema(crmPipelineStatuses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCrmFollowUpSchema = createInsertSchema(crmFollowUps).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export const insertCrmInteractionSchema = createInsertSchema(crmInteractions).omit({ id: true, createdAt: true });
export const insertMarketingContentPlanSchema = createInsertSchema(marketingContentPlans).omit({ id: true, createdAt: true, updatedAt: true, publishedAt: true });
export const insertHelpArticleSchema = createInsertSchema(helpArticles).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true });
export const insertVisualBrandKitSchema = createInsertSchema(visualBrandKits).omit({ id: true, createdAt: true, updatedAt: true, validFrom: true });
export const insertVisualMediaStandardSchema = createInsertSchema(visualMediaStandards).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVisualMediaAuthorizationSchema = createInsertSchema(visualMediaAuthorizations).omit({ id: true, createdAt: true, updatedAt: true, revokedAt: true });
export const insertVisualAssetSchema = createInsertSchema(visualAssets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVisualTemplateSchema = createInsertSchema(visualTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVisualCompositionSchema = createInsertSchema(visualCompositions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMaterialReturnPolicyAuditSchema = createInsertSchema(materialReturnPolicyAudits).omit({ id: true, createdAt: true });
export const insertMaterialCustodyTransferSchema = createInsertSchema(materialCustodyTransfers).omit({ id: true, createdAt: true, updatedAt: true, acceptedAt: true });
export const insertMaterialResponsibilityCaseSchema = createInsertSchema(materialResponsibilityCases).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true });
export const insertMaterialKitSchema = createInsertSchema(materialKits).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMaterialKitItemSchema = createInsertSchema(materialKitItems).omit({ id: true, createdAt: true });
export const insertToolMaintenanceRecordSchema = createInsertSchema(toolMaintenanceRecords).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export const insertMaterialCountAuditSchema = createInsertSchema(materialCountAudits).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true });
export const insertMaterialTrainingGuideSchema = createInsertSchema(materialTrainingGuides).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true });
export const insertCommercialPolicySchema = createInsertSchema(commercialPolicies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDiscountRequestSchema = createInsertSchema(discountRequests).omit({ id: true, createdAt: true, updatedAt: true, decidedAt: true });
export const insertCommissionRecordSchema = createInsertSchema(commissionRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLogisticsRecordSchema = createInsertSchema(logisticsRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuoteVersionSchema = createInsertSchema(quoteVersions).omit({ id: true, createdAt: true });
export const insertScopeChangeRequestSchema = createInsertSchema(scopeChangeRequests).omit({ id: true, createdAt: true, updatedAt: true, decidedAt: true });
export const insertTechnicalProcedureSchema = createInsertSchema(technicalProcedures).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true });
export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true });
export const insertWorkOrderQualityRunSchema = createInsertSchema(workOrderQualityRuns).omit({ id: true, createdAt: true, updatedAt: true, startedAt: true, completedAt: true });
export const insertQualityEventSchema = createInsertSchema(qualityEvents).omit({ id: true, createdAt: true, updatedAt: true, resolvedAt: true });

export type SalaryDiscountRule = typeof salaryDiscountRules.$inferSelect;
export type SalaryDiscount = typeof salaryDiscounts.$inferSelect;
export type InsertSalaryDiscountRule = typeof insertSalaryDiscountRuleSchema._type;
export type InsertSalaryDiscount = typeof insertSalaryDiscountSchema._type;
export type CrmPipelineStatus = typeof crmPipelineStatuses.$inferSelect;
export type InsertCrmPipelineStatus = typeof insertCrmPipelineStatusSchema._type;
export type CrmFollowUp = typeof crmFollowUps.$inferSelect;
export type InsertCrmFollowUp = typeof insertCrmFollowUpSchema._type;
export type CrmInteraction = typeof crmInteractions.$inferSelect;
export type InsertCrmInteraction = typeof insertCrmInteractionSchema._type;
export type MarketingContentPlan = typeof marketingContentPlans.$inferSelect;
export type InsertMarketingContentPlan = typeof insertMarketingContentPlanSchema._type;
export type HelpArticle = typeof helpArticles.$inferSelect;
export type InsertHelpArticle = typeof insertHelpArticleSchema._type;
export type VisualBrandKit = typeof visualBrandKits.$inferSelect;
export type InsertVisualBrandKit = typeof insertVisualBrandKitSchema._type;
export type VisualMediaStandard = typeof visualMediaStandards.$inferSelect;
export type InsertVisualMediaStandard = typeof insertVisualMediaStandardSchema._type;
export type VisualMediaAuthorization = typeof visualMediaAuthorizations.$inferSelect;
export type InsertVisualMediaAuthorization = typeof insertVisualMediaAuthorizationSchema._type;
export type VisualAsset = typeof visualAssets.$inferSelect;
export type InsertVisualAsset = typeof insertVisualAssetSchema._type;
export type VisualTemplate = typeof visualTemplates.$inferSelect;
export type InsertVisualTemplate = typeof insertVisualTemplateSchema._type;
export type VisualComposition = typeof visualCompositions.$inferSelect;
export type InsertVisualComposition = typeof insertVisualCompositionSchema._type;
export type MaterialReturnPolicyAudit = typeof materialReturnPolicyAudits.$inferSelect;
export type InsertMaterialReturnPolicyAudit = typeof insertMaterialReturnPolicyAuditSchema._type;
export type CommercialPolicy = typeof commercialPolicies.$inferSelect;
export type InsertCommercialPolicy = typeof insertCommercialPolicySchema._type;
export type DiscountRequest = typeof discountRequests.$inferSelect;
export type InsertDiscountRequest = typeof insertDiscountRequestSchema._type;
export type CommissionRecord = typeof commissionRecords.$inferSelect;
export type InsertCommissionRecord = typeof insertCommissionRecordSchema._type;
export type LogisticsRecord = typeof logisticsRecords.$inferSelect;
export type InsertLogisticsRecord = typeof insertLogisticsRecordSchema._type;
export type QuoteVersion = typeof quoteVersions.$inferSelect;
export type InsertQuoteVersion = typeof insertQuoteVersionSchema._type;
export type ScopeChangeRequest = typeof scopeChangeRequests.$inferSelect;
export type InsertScopeChangeRequest = typeof insertScopeChangeRequestSchema._type;
export type TechnicalProcedure = typeof technicalProcedures.$inferSelect;
export type InsertTechnicalProcedure = typeof insertTechnicalProcedureSchema._type;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertChecklistTemplate = typeof insertChecklistTemplateSchema._type;
export type WorkOrderQualityRun = typeof workOrderQualityRuns.$inferSelect;
export type InsertWorkOrderQualityRun = typeof insertWorkOrderQualityRunSchema._type;
export type QualityEvent = typeof qualityEvents.$inferSelect;
export type InsertQualityEvent = typeof insertQualityEventSchema._type;
export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({ id: true, createdAt: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true });
export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertMaterialSaleSchema = createInsertSchema(materialSales).omit({ id: true, createdAt: true, approvedAt: true });
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
export type InsertMaterialSale = z.infer<typeof insertMaterialSaleSchema>;
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
export type MaterialSale = typeof materialSales.$inferSelect;
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
export type InsertWorkOrderStatus = z.infer<typeof insertWorkOrderStatusSchema>;
export type WorkOrderStatus = typeof workOrderStatuses.$inferSelect;

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
