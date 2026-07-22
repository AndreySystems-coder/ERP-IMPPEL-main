export const TECHNICAL_TEAM_ROLE = {
  name: "equipe-tecnica",
  label: "Equipe Técnica",
  permissions: {
    viewWorks: true,
    viewWorkOrders: true,
    viewObraRegistro: true,
    viewInventory: true,
    viewInventoryCurrent: true,
    viewInventoryMovements: true,
    viewTeam: true,
    registrarMaterials: true,
  },
} as const;

export type OperationalEmployeeInput = {
  nomeCompleto: string;
  dataNascimento?: string;
  cargo?: string;
  perfil?: string;
  status?: string;
  login?: string;
  senhaInicial?: string;
};

export type NormalizedOperationalEmployee = {
  login: string;
  senhaInicial: string;
  nomeCompleto: string;
  dataNascimento: string | null;
  cargo: string;
  perfil: "Funcionário" | "Administrador";
  status: "Ativo" | "Inativo";
};

export function normalizeLoginPart(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export function generateEmployeeLogin(nomeCompleto: string) {
  const parts = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) throw new Error("Informe nome e sobrenome para gerar o login.");
  const first = normalizeLoginPart(parts[0]);
  const last = normalizeLoginPart(parts[parts.length - 1]);
  if (!first || !last) throw new Error("Não foi possível gerar o login a partir do nome.");
  return `${first}.${last}`;
}

export function normalizeBirthDate(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) throw new Error("Data de nascimento deve estar no formato DD/MM/AAAA.");
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) throw new Error("Data de nascimento inválida.");
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

export function generateInitialPassword(dataNascimento: string) {
  return normalizeBirthDate(dataNascimento).replace(/\D/g, "");
}

export function normalizeOperationalEmployee(input: OperationalEmployeeInput): NormalizedOperationalEmployee {
  const nomeCompleto = String(input.nomeCompleto || "").trim().replace(/\s+/g, " ");
  if (!nomeCompleto) throw new Error("Nome completo é obrigatório.");
  const initialDigits = String(input.senhaInicial || "").replace(/\D/g, "");
  const dateFromInitialPassword = initialDigits.length === 8 ? `${initialDigits.slice(0, 2)}/${initialDigits.slice(2, 4)}/${initialDigits.slice(4)}` : "";
  const birthDateSource = String(input.dataNascimento || dateFromInitialPassword || "").trim();
  const dataNascimento = birthDateSource ? normalizeBirthDate(birthDateSource) : null;
  const perfil = String(input.perfil || "Funcionário").toLowerCase().startsWith("admin") ? "Administrador" : "Funcionário";
  const status = String(input.status || "Ativo").toLowerCase() === "inativo" ? "Inativo" : "Ativo";
  const suppliedLogin = String(input.login || "").trim();
  return {
    login: suppliedLogin ? suppliedLogin.split(".").map(normalizeLoginPart).filter(Boolean).join(".") : generateEmployeeLogin(nomeCompleto),
    senhaInicial: initialDigits || (dataNascimento ? generateInitialPassword(dataNascimento) : ""),
    nomeCompleto,
    dataNascimento,
    cargo: String(input.cargo || TECHNICAL_TEAM_ROLE.label).trim() || TECHNICAL_TEAM_ROLE.label,
    perfil,
    status,
  };
}

export function parseOperationalEmployeesText(text: string): OperationalEmployeeInput[] {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
    const parts = line.split(/[;\t|]/).map(part => part.trim());
    if (parts.length < 2) throw new Error(`Linha ${index + 1}: use Nome completo; DD/MM/AAAA; Cargo (opcional).`);
    return { nomeCompleto: parts[0], dataNascimento: parts[1], cargo: parts[2] || undefined };
  });
}
