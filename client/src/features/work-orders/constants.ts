export const CHECKLIST_ITEMS = [
  { key: "area_preparada", label: "Área preparada e limpa" },
  { key: "primario_aplicado", label: "Primário aplicado e seco" },
  { key: "materiais_conferidos", label: "Materiais conferidos" },
  { key: "epi_utilizado", label: "EPI utilizado pela equipe" },
  { key: "fotos_antes", label: "Fotos de antes registradas" },
  { key: "fotos_depois", label: "Fotos de depois registradas" },
  { key: "cliente_informado", label: "Cliente informado do prazo de cura" },
  { key: "limpeza_final", label: "Limpeza final realizada" },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  Planejada: "bg-blue-100 text-blue-700",
  Agendada: "bg-amber-100 text-amber-700",
  "Em Andamento": "bg-primary/10 text-primary border border-primary/20",
  Concluída: "bg-emerald-100 text-emerald-700",
};
