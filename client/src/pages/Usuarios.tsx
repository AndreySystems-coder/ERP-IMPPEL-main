import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  UserCog, Plus, Trash2, Shield, User, Key, Check, X, Eye, EyeOff,
  Briefcase, Settings2, Edit3, Save, ChevronDown, ChevronRight, Users,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface UserItem {
  id: number;
  username: string;
  role: "admin" | "funcionario";
  roleId: number | null;
  jobTitle: string | null;
  roleName: string | null;
  roleLabel: string | null;
}

interface Role {
  id: number;
  name: string;
  label: string;
  permissions: string;
  isDefault: boolean;
  createdAt: string;
}

// ─── Permission definitions ─────────────────────────────────────────────────────
const PERMISSION_GROUPS = [
  {
    group: "Módulos principais",
    items: [
      { key: "viewDashboard", label: "Dashboard" },
      { key: "viewCrm", label: "CRM" },
      { key: "viewQuotes", label: "Orçamentos" },
      { key: "viewWorks", label: "Obras" },
      { key: "viewInventory", label: "Estoque" },
      { key: "viewTeam", label: "Equipe" },
      { key: "viewFinancials", label: "Financeiro" },
      { key: "viewSettings", label: "Configurações" },
      { key: "viewBackups", label: "Backups" },
    ],
  },
  {
    group: "CRM",
    items: [
      { key: "viewLeads", label: "Leads" },
      { key: "viewCrmWhatsapp", label: "WhatsApp" },
      { key: "viewClients", label: "Clientes" },
    ],
  },
  {
    group: "Orçamentos",
    items: [
      { key: "viewQuotes", label: "Orçamentos" },
      { key: "viewQuoteTemplates", label: "Templates" },
      { key: "viewQuoteRules", label: "Regras e catálogo de serviços" },
    ],
  },
  {
    group: "Obras",
    items: [
      { key: "viewWorkOrders", label: "Ordens de Serviço" },
      { key: "viewAllWorkOrders", label: "Ver todas as Ordens de Serviço" },
      { key: "editWorkOrders", label: "Editar Ordens de Serviço" },
      { key: "viewObraRegistro", label: "Registro de Obras" },
      { key: "viewCalendar", label: "Calendário" },
    ],
  },
  {
    group: "Estoque",
    items: [
      { key: "viewInventoryCurrent", label: "Estoque Atual" },
      { key: "viewInventoryCount", label: "Contagem Física" },
      { key: "viewInventoryMovements", label: "Movimentações" },
      { key: "editInventory", label: "Editar produtos do estoque" },
    ],
  },
  {
    group: "Equipe",
    items: [
      { key: "viewProductivity", label: "Produtividade" },
      { key: "registrarMaterials", label: "Controle de Materiais" },
      { key: "viewAllMaterials", label: "Ver retiradas de todos os funcionários" },
      { key: "viewWarranties", label: "Garantias" },
      { key: "viewPostSale", label: "Pós-venda" },
    ],
  },
  {
    group: "Financeiro",
    items: [
      { key: "viewPayments", label: "Pagamentos" },
      { key: "viewCashFlow", label: "Fluxo de Caixa" },
      { key: "viewFinancialSettings", label: "Configurações financeiras" },
    ],
  },
  {
    group: "Configurações",
    items: [
      { key: "viewCostSettings", label: "Custos" },
      { key: "viewStatusSettings", label: "Status" },
      { key: "viewUsers", label: "Usuários" },
      { key: "viewPriorityRules", label: "Regras" },
    ],
  },
  {
    group: "Backups",
    items: [
      { key: "viewBackupGeneration", label: "Backup" },
      { key: "viewRestore", label: "Restauração" },
      { key: "viewExports", label: "Exportação" },
    ],
  },
];

function parsePermissions(raw: string): Record<string, boolean> {
  try { return JSON.parse(raw); } catch { return {}; }
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Usuarios() {
  const { data: currentUser } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("usuarios");

  // ── User form state ──────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "funcionario">("funcionario");
  const [newRoleId, setNewRoleId] = useState<string>("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [editingPassword, setEditingPassword] = useState<number | null>(null);
  const [newPassValue, setNewPassValue] = useState("");
  const [showEditPass, setShowEditPass] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState<number | null>(null);
  const [jobTitleValue, setJobTitleValue] = useState("");
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  // ── Role form state ──────────────────────────────────────────────────────────
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: users = [], isLoading: loadingUsers } = useQuery<UserItem[]>({
    queryKey: ["/api/users"],
  });

  const { data: rolesData = [], isLoading: loadingRoles } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  // ── User mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      setShowForm(false); setNewUsername(""); setNewPassword(""); setNewRole("funcionario"); setNewRoleId(""); setNewJobTitle("");
      toast({ title: "Usuário criado com sucesso!" });
    },
    onError: async (err: any) => toast({ title: err.message || "Erro ao criar usuário", variant: "destructive" }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => apiRequest("PATCH", `/api/users/${id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/users"] }); toast({ title: "Papel atualizado!" }); },
  });

  const roleIdMutation = useMutation({
    mutationFn: ({ id, roleId }: { id: number; roleId: number | null }) => apiRequest("PATCH", `/api/users/${id}/role-id`, { roleId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/users"] }); toast({ title: "Cargo atualizado!" }); },
  });

  const jobTitleMutation = useMutation({
    mutationFn: ({ id, jobTitle }: { id: number; jobTitle: string }) => apiRequest("PATCH", `/api/users/${id}/job-title`, { jobTitle }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingJobTitle(null); setJobTitleValue("");
      toast({ title: "Título atualizado!" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => apiRequest("PATCH", `/api/users/${id}/password`, { password }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/users"] }); setEditingPassword(null); setNewPassValue(""); toast({ title: "Senha atualizada!" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/users"] }); toast({ title: "Usuário excluído." }); },
    onError: async (err: any) => toast({ title: err.message || "Erro ao excluir", variant: "destructive" }),
  });

  // ── Role mutations ────────────────────────────────────────────────────────────
  const createRoleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/roles", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/roles"] }); resetRoleForm(); toast({ title: "Cargo criado!" }); },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/roles/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/roles"] }); resetRoleForm(); toast({ title: "Cargo atualizado!" }); },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/roles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/roles"] }); qc.invalidateQueries({ queryKey: ["/api/users"] }); toast({ title: "Cargo removido." }); },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const resetRoleForm = () => {
    setShowRoleForm(false); setEditingRole(null); setRoleName(""); setRoleLabel(""); setRolePermissions({});
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role); setRoleName(role.name); setRoleLabel(role.label); setRolePermissions(parsePermissions(role.permissions));
    setShowRoleForm(true);
  };

  const openNewRole = () => {
    setEditingRole(null); setRoleName(""); setRoleLabel(""); setRolePermissions({});
    setShowRoleForm(true);
  };

  const handleSaveRole = () => {
    if (!roleName.trim() || !roleLabel.trim()) return toast({ title: "Preencha nome e título do cargo", variant: "destructive" });
    if (editingRole) updateRoleMutation.mutate({ id: editingRole.id, data: { name: roleName.trim(), label: roleLabel.trim(), permissions: rolePermissions } });
    else createRoleMutation.mutate({ name: roleName.trim(), label: roleLabel.trim(), permissions: rolePermissions });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return toast({ title: "Preencha todos os campos", variant: "destructive" });
    createMutation.mutate({ username: newUsername.trim(), password: newPassword, role: newRole, roleId: newRoleId ? Number(newRoleId) : null, jobTitle: newJobTitle || null });
  };

  const togglePermission = (key: string) => {
    setRolePermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCog className="w-6 h-6 text-primary" /> Gestão de Usuários
          </h1>
          <p className="text-slate-500 text-sm mt-1">Crie usuários, defina cargos e configure permissões</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="usuarios" data-testid="tab-usuarios"><Users className="w-4 h-4 mr-2" />Usuários ({users.length})</TabsTrigger>
          <TabsTrigger value="cargos" data-testid="tab-cargos"><Settings2 className="w-4 h-4 mr-2" />Cargos e Permissões ({rolesData.length})</TabsTrigger>
        </TabsList>

        {/* ── ABA USUÁRIOS ─────────────────────────────────────────────────────── */}
        <TabsContent value="usuarios" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowForm(!showForm)} data-testid="button-novo-usuario">
              <Plus className="w-4 h-4 mr-2" /> Novo Usuário
            </Button>
          </div>

          {/* Create form */}
          {showForm && (
            <Card className="border-blue-200">
              <CardHeader className="pb-3"><CardTitle className="text-base">Criar Novo Usuário</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Nome de usuário <span className="text-red-500">*</span></Label>
                      <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Ex: joao.silva" data-testid="input-novo-username" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Senha <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Input type={showNewPass ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 4 caracteres" className="pr-10" data-testid="input-nova-senha" />
                        <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-2.5 text-slate-400">
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Título do cargo (exibição)</Label>
                      <Input value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} placeholder="Ex: Aplicador de impermeabilização" data-testid="input-job-title" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Cargo com permissões</Label>
                      <Select value={newRoleId} onValueChange={setNewRoleId}>
                        <SelectTrigger data-testid="select-role"><SelectValue placeholder="Selecionar cargo..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem cargo específico</SelectItem>
                          {rolesData.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Nível de acesso</Label>
                    <div className="flex gap-3">
                      {(["funcionario", "admin"] as const).map(r => (
                        <button key={r} type="button" onClick={() => setNewRole(r)}
                          className={`flex-1 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all flex items-center justify-center gap-2 ${newRole === r ? (r === "admin" ? "bg-primary border-primary text-white" : "bg-slate-800 border-slate-800 text-white") : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                          data-testid={`button-role-${r}`}>
                          {r === "admin" ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          {r === "admin" ? "Administrador" : "Funcionário"}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      {newRole === "admin"
                        ? "Acesso completo a todo o sistema, independente do cargo."
                        : "Acesso restrito conforme o cargo selecionado acima."}
                    </p>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-criar-usuario">
                      {createMutation.isPending ? "Criando..." : "Criar Usuário"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* User list */}
          {loadingUsers ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <Card key={u.id} className="overflow-hidden" data-testid={`card-user-${u.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4 flex-wrap">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${u.role === "admin" ? "bg-primary" : "bg-slate-500"}`}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800" data-testid={`text-username-${u.id}`}>{u.username}</span>
                          {u.id === (currentUser as any)?.id && (
                            <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">Você</span>
                          )}
                          <Badge variant="outline" className={u.role === "admin" ? "text-primary border-primary/30 bg-primary/5" : "text-slate-600"}>
                            {u.role === "admin" ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                            {u.role === "admin" ? "Administrador" : "Funcionário"}
                          </Badge>
                          {u.roleLabel && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                              <Briefcase className="w-3 h-3 mr-1" />{u.roleLabel}
                            </Badge>
                          )}
                        </div>
                        {u.jobTitle && (
                          <p className="text-xs text-gray-500 mt-0.5 italic" data-testid={`text-jobtitle-${u.id}`}>{u.jobTitle}</p>
                        )}

                        {/* Expand/collapse controls */}
                        {u.id !== (currentUser as any)?.id && (
                          <button className="mt-2 text-xs text-slate-500 hover:text-primary flex items-center gap-1" onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)} data-testid={`button-expand-${u.id}`}>
                            {expandedUser === u.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} Gerenciar
                          </button>
                        )}

                        {expandedUser === u.id && (
                          <div className="mt-3 space-y-3 border-t pt-3">
                            {/* Change role */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-500 w-24">Nível de acesso:</span>
                              {(["funcionario", "admin"] as const).filter(r => r !== u.role).map(r => (
                                <button key={r} onClick={() => roleMutation.mutate({ id: u.id, role: r })} disabled={roleMutation.isPending}
                                  className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-medium transition-colors"
                                  data-testid={`button-change-role-${u.id}-${r}`}>
                                  → {r === "admin" ? "Administrador" : "Funcionário"}
                                </button>
                              ))}
                            </div>

                            {/* Assign cargo */}
                            {u.role !== "admin" && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-slate-500 w-24">Cargo:</span>
                                <Select value={u.roleId ? String(u.roleId) : "none"} onValueChange={v => roleIdMutation.mutate({ id: u.id, roleId: v === "none" ? null : Number(v) })}>
                                  <SelectTrigger className="h-8 text-xs w-48" data-testid={`select-cargo-${u.id}`}><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sem cargo específico</SelectItem>
                                    {rolesData.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Edit job title */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-500 w-24">Título:</span>
                              {editingJobTitle === u.id ? (
                                <>
                                  <Input value={jobTitleValue} onChange={e => setJobTitleValue(e.target.value)} placeholder="Ex: Encarregado de obras" className="h-8 text-xs w-48" data-testid={`input-jobtitle-${u.id}`} />
                                  <button onClick={() => jobTitleMutation.mutate({ id: u.id, jobTitle: jobTitleValue })} className="p-1.5 bg-emerald-500 text-white rounded-lg"><Check className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => { setEditingJobTitle(null); setJobTitleValue(""); }} className="p-1.5 bg-slate-200 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                                </>
                              ) : (
                                <button onClick={() => { setEditingJobTitle(u.id); setJobTitleValue(u.jobTitle || ""); }}
                                  className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1"
                                  data-testid={`button-edit-jobtitle-${u.id}`}>
                                  <Edit3 className="w-3 h-3" /> {u.jobTitle || "Definir título"}
                                </button>
                              )}
                            </div>

                            {/* Change password */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-500 w-24">Senha:</span>
                              {editingPassword === u.id ? (
                                <>
                                  <div className="relative">
                                    <Input type={showEditPass ? "text" : "password"} value={newPassValue} onChange={e => setNewPassValue(e.target.value)} placeholder="Nova senha (mín. 4 chars)" className="h-8 text-xs pr-8 w-48" data-testid={`input-senha-${u.id}`} />
                                    <button type="button" onClick={() => setShowEditPass(!showEditPass)} className="absolute right-2 top-1.5 text-slate-400">
                                      {showEditPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                  <button onClick={() => passwordMutation.mutate({ id: u.id, password: newPassValue })} disabled={passwordMutation.isPending} className="p-1.5 bg-emerald-500 text-white rounded-lg" data-testid={`button-confirm-senha-${u.id}`}><Check className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => { setEditingPassword(null); setNewPassValue(""); }} className="p-1.5 bg-slate-200 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                                </>
                              ) : (
                                <button onClick={() => { setEditingPassword(u.id); setNewPassValue(""); }}
                                  className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1"
                                  data-testid={`button-edit-senha-${u.id}`}>
                                  <Key className="w-3 h-3" /> Alterar senha
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Delete */}
                      {u.id !== (currentUser as any)?.id && (
                        <button onClick={() => { if (confirm(`Excluir o usuário "${u.username}"?`)) deleteMutation.mutate(u.id); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          data-testid={`button-delete-usuario-${u.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ABA CARGOS ───────────────────────────────────────────────────────── */}
        <TabsContent value="cargos" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Cargos e Permissões</h2>
              <p className="text-sm text-gray-500">Configure o que cada cargo pode visualizar e fazer no sistema</p>
            </div>
            <Button onClick={openNewRole} className="bg-blue-900 hover:bg-blue-800 text-white" data-testid="button-novo-cargo">
              <Plus className="w-4 h-4 mr-2" /> Novo Cargo
            </Button>
          </div>

          {/* Role form */}
          {showRoleForm && (
            <Card className="border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{editingRole ? `Editando: ${editingRole.label}` : "Criar Novo Cargo"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nome interno (sem espaços)</Label>
                    <Input value={roleName} onChange={e => setRoleName(e.target.value.toLowerCase().replace(/\s/g, "_"))} placeholder="ex: encarregado" disabled={!!editingRole} data-testid="input-role-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Título de exibição</Label>
                    <Input value={roleLabel} onChange={e => setRoleLabel(e.target.value)} placeholder="Ex: Encarregado de Obra" data-testid="input-role-label" />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-gray-700">Permissões</Label>
                  {PERMISSION_GROUPS.map(group => (
                    <div key={group.group} className="space-y-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{group.group}</p>
                      <div className="space-y-2 pl-2">
                        {group.items.map(item => (
                          <div key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors" data-testid={`permission-row-${item.key}`}>
                            <Label className="cursor-pointer text-sm font-normal text-gray-700">{item.label}</Label>
                            <Switch checked={!!rolePermissions[item.key]} onCheckedChange={() => togglePermission(item.key)} data-testid={`switch-permission-${item.key}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button onClick={handleSaveRole} className="bg-blue-900 text-white" disabled={createRoleMutation.isPending || updateRoleMutation.isPending} data-testid="button-save-role">
                    <Save className="w-4 h-4 mr-2" /> Salvar Cargo
                  </Button>
                  <Button variant="outline" onClick={resetRoleForm}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Roles list */}
          {loadingRoles ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}</div>
          ) : rolesData.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum cargo criado ainda</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {rolesData.map(role => {
                const perms = parsePermissions(role.permissions);
                const enabledCount = Object.values(perms).filter(Boolean).length;
                const totalPerms = PERMISSION_GROUPS.reduce((s, g) => s + g.items.length, 0);
                const usersWithRole = users.filter(u => u.roleId === role.id);
                return (
                  <Card key={role.id} className="overflow-hidden" data-testid={`card-role-${role.id}`}>
                    <div className="h-1 bg-blue-900" />
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-800" data-testid={`text-role-label-${role.id}`}>{role.label}</span>
                            <Badge variant="outline" className="text-xs text-gray-500 font-mono">{role.name}</Badge>
                            <Badge className="bg-blue-100 text-blue-700 text-xs">{enabledCount}/{totalPerms} permissões</Badge>
                            {usersWithRole.length > 0 && (
                              <Badge className="bg-gray-100 text-gray-600 text-xs"><Users className="w-3 h-3 mr-1" />{usersWithRole.length} usuário(s)</Badge>
                            )}
                          </div>

                          {/* Permission summary */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {PERMISSION_GROUPS.flatMap(g => g.items).map(item => (
                              <span key={item.key} className={`text-xs px-1.5 py-0.5 rounded ${perms[item.key] ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400 line-through"}`}>
                                {item.label}
                              </span>
                            ))}
                          </div>

                          {/* Users with this role */}
                          {usersWithRole.length > 0 && (
                            <p className="text-xs text-gray-500 mt-2">
                              Atribuído a: {usersWithRole.map(u => u.username).join(", ")}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditRole(role)} data-testid={`button-edit-role-${role.id}`}><Edit3 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50"
                            onClick={() => { if (confirm(`Excluir o cargo "${role.label}"?`)) deleteRoleMutation.mutate(role.id); }}
                            data-testid={`button-delete-role-${role.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Info card */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Como funciona</p>
                  <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc list-inside">
                    <li><strong>Administradores</strong> têm acesso total independente do cargo.</li>
                    <li><strong>Funcionários</strong> acessam apenas o que o cargo permite.</li>
                    <li>O cargo define o que pode visualizar e editar; o título é apenas para exibição.</li>
                    <li>Sem cargo atribuído, funcionários acessam apenas Registro de Obra e Controle de Materiais (suas saídas).</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
