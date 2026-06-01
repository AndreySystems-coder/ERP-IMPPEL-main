export interface ButtonItem {
  id: string;
  text: string;
  responseMessage: string;
}

export interface FlowForm {
  name: string;
  trigger: string;
  message: string;
  messageType: "text" | "buttons";
  buttons: ButtonItem[];
  includePdf: boolean;
  active: boolean;
  sortOrder: number;
}

export interface WhatsappTemplate {
  id: number;
  name: string;
  category: string;
  message: string;
  variables: string | null;
  active: boolean;
  createdAt: string | null;
}

export interface TemplateForm {
  name: string;
  category: string;
  message: string;
  variables: string;
  active: boolean;
}

export interface SendTarget {
  flowId?: number | null;
  flowName: string;
  message: string;
  phone?: string | null;
  templateId?: number | null;
  templateName?: string;
}

export interface CrmLeadQuoteLink {
  id: number;
  orcamentoNumero?: number | null;
  status?: string | null;
  realPriceSold?: number | null;
  serviceType?: string | null;
}

export interface CrmLeadWorkOrderLink {
  id: number;
  status?: string | null;
  serviceType?: string | null;
}

export interface CrmLeadOperationalLinks {
  quotes: CrmLeadQuoteLink[];
  workOrders: CrmLeadWorkOrderLink[];
  warranties: { id: number; status?: string | null; endDate?: string | null }[];
  npsPending: number;
  maintenancePending: number;
  nextAction: string;
}
