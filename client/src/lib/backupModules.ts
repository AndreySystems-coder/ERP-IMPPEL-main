import {
  Package, Users, Briefcase, ClipboardList, ShoppingCart, Layers, PackageCheck, Shield, FileText,
} from "lucide-react";
import type { BackupType } from "@/components/BackupManager";

export type BackupModuleConfig = {
  type: BackupType;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
};

// Fonte única dos módulos de Backup — reaproveitada tanto no Passo 1 (Backup)
// quanto no Passo 2 (Restauração) para garantir que os cards fiquem idênticos.
export const ALL_BACKUP_TYPES: BackupModuleConfig[] = [
  { type: "usuarios", label: "Usuários e Cargos", icon: Users, color: "text-indigo-600 bg-indigo-50 border-indigo-200", description: "Backup técnico com hashes bcrypt" },
  { type: "estoque", label: "Estoque", icon: Package, color: "text-blue-600 bg-blue-50 border-blue-200", description: "Itens e movimentações" },
  { type: "produtos", label: "Catálogo de Produtos", icon: ShoppingCart, color: "text-emerald-600 bg-emerald-50 border-emerald-200", description: "Produtos do catálogo de vendas" },
  { type: "servicos", label: "Catálogo de Serviços", icon: Layers, color: "text-violet-600 bg-violet-50 border-violet-200", description: "Serviços com custos e margens" },
  { type: "materiais", label: "Controle de Materiais", icon: PackageCheck, color: "text-amber-600 bg-amber-50 border-amber-200", description: "Retiradas e consumo de obra" },
  { type: "clientes", label: "Clientes", icon: Users, color: "text-sky-600 bg-sky-50 border-sky-200", description: "Cadastro completo de clientes" },
  { type: "orcamentos", label: "Orçamentos", icon: Briefcase, color: "text-orange-600 bg-orange-50 border-orange-200", description: "Orçamentos e negociações" },
  { type: "ordens-servico", label: "Ordens de Serviço", icon: ClipboardList, color: "text-rose-600 bg-rose-50 border-rose-200", description: "Ordens de execução de obras" },
  { type: "financeiro", label: "Financeiro", icon: FileText, color: "text-green-600 bg-green-50 border-green-200", description: "Pagamentos, recebimentos e caixa" },
  { type: "pos-venda", label: "Garantias/Pós-venda", icon: Shield, color: "text-teal-600 bg-teal-50 border-teal-200", description: "Garantias, NPS e manutenções" },
];
