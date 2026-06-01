import type { FlowForm, TemplateForm } from "@/features/crm-whatsapp/types";

export const emptyFlowForm = (): FlowForm => ({
  name: "",
  trigger: "atendimento_inicial",
  message: "",
  messageType: "text",
  buttons: [],
  includePdf: false,
  active: true,
  sortOrder: 0,
});

export const emptyTemplateForm = (): TemplateForm => ({
  name: "",
  category: "geral",
  message: "",
  variables: "",
  active: true,
});
