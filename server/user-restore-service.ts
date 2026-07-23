import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { normalizeOperationalEmployee } from "@shared/operationalUsers";
import { defaultPermissionsForRole, normalizeRoleName } from "@shared/rolePermissions";

const BCRYPT_ROUNDS = 10;

function parsePermissionPayload(value: unknown) {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return value && typeof value === "object" ? value as Record<string, boolean> : {};
}

function hasPermissions(value: unknown) {
  return Object.values(parsePermissionPayload(value)).some(Boolean);
}

function restoreInitialPassword(user: any) {
  const explicit = String(user?.senhaInicial || user?.initialPassword || "").trim();
  if (explicit && !/^(Senha alterada|Não disponível|Nao disponível|Não disponivel|Nao disponivel|—)$/i.test(explicit)) {
    const digits = explicit.replace(/\D/g, "");
    if (digits.length === 8) {
      if (/^\d{4}/.test(explicit) && Number(digits.slice(4, 6)) <= 12) {
        return `${digits.slice(6, 8)}${digits.slice(4, 6)}${digits.slice(0, 4)}`;
      }
      return digits;
    }
  }
  const birthDate = String(user?.birthDate || user?.dataNascimento || user?.birth_date || "").trim();
  if (!birthDate) return "";
  try {
    return normalizeOperationalEmployee({ nomeCompleto: user?.nomeCompleto || user?.fullName || user?.username || "Usuário", dataNascimento: birthDate }).senhaInicial;
  } catch {
    return "";
  }
}

function restoreBirthDate(user: any, initialPassword: string) {
  const supplied = String(user?.birthDate || user?.dataNascimento || user?.birth_date || "").trim();
  if (supplied) return normalizeOperationalEmployee({ nomeCompleto: "Validação Temporária", dataNascimento: supplied }).dataNascimento;
  const digits = initialPassword.replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}` : null;
}

function temporaryPassword() {
  return randomBytes(32).toString("base64url");
}

export async function restoreUsersAndRolesFromBackup(input: { data: any; storage: any }) {
  const { data, storage } = input;
  if (!Array.isArray(data?.users) || !Array.isArray(data?.roles)) {
    throw new Error("Formato de backup de usuários inválido");
  }

  const existingRoles: any[] = await storage.getRoles();
  const rolesByName = new Map<string, any>(existingRoles.map((role: any) => [String(role.name).toLocaleLowerCase("pt-BR"), role]));
  const restoredRoles = new Map<string, number>();
  const restoredRoleIds = new Map<number, number>();
  const warnings: string[] = [];
  const userDetails: Array<{ username: string; status: string; reason?: string }> = [];
  const roleDetails: Array<{ name: string; status: string; reason?: string }> = [];
  const counters = {
    users: { created: 0, updated: 0, existing: 0, pending: 0, invalid: 0, ignored: 0, requiresPasswordReset: 0 },
    roles: { created: 0, updated: 0, preserved: 0, invalid: 0, permissionsExtracted: 0, permissionsPreserved: 0 },
  };
  let skipped = 0;

  for (const role of data.roles) {
    const rawName = String(role?.name || role?.roleName || "").trim();
    const label = String(role?.label || role?.roleLabel || "").trim();
    if (!rawName && !label) {
      counters.roles.invalid++;
      skipped++;
      roleDetails.push({ name: "sem nome", status: "invalid", reason: "Cargo sem nome técnico e sem label." });
      continue;
    }
    const name = normalizeRoleName(rawName || label);
    const key = name.toLocaleLowerCase("pt-BR");
    const fallbackPermissions = defaultPermissionsForRole(name) || defaultPermissionsForRole(label);
    const incomingPermissions = hasPermissions(role.permissions) ? parsePermissionPayload(role.permissions) : (fallbackPermissions || {});
    const hasIncomingPermissions = hasPermissions(incomingPermissions);
    const existing = rolesByName.get(key);

    if (existing) {
      const updates: any = { name, label: label || existing.label, isDefault: Boolean(role.isDefault ?? existing.isDefault) };
      if (hasIncomingPermissions) {
        updates.permissions = JSON.stringify(incomingPermissions);
        counters.roles.permissionsExtracted++;
      } else {
        counters.roles.permissionsPreserved++;
        warnings.push(`Permissões preservadas para ${existing.label}: o PDF não trouxe permissões válidas.`);
      }
      await storage.updateRole(existing.id, updates);
      restoredRoles.set(key, existing.id);
      if (role.id) restoredRoleIds.set(Number(role.id), existing.id);
      counters.roles.updated++;
      roleDetails.push({ name, status: hasIncomingPermissions ? "updated" : "preserved", reason: hasIncomingPermissions ? "Permissões válidas aplicadas." : "Permissões existentes preservadas." });
      continue;
    }

    if (!hasIncomingPermissions) {
      counters.roles.invalid++;
      skipped++;
      warnings.push(`Cargo ${label || name} não criado: permissões ausentes no PDF.`);
      roleDetails.push({ name, status: "invalid", reason: "Cargo novo sem permissões válidas." });
      continue;
    }

    const saved = await storage.createRole({ name, label: label || name, permissions: JSON.stringify(incomingPermissions), isDefault: Boolean(role.isDefault) });
    restoredRoles.set(key, saved.id);
    if (role.id) restoredRoleIds.set(Number(role.id), saved.id);
    counters.roles.created++;
    counters.roles.permissionsExtracted++;
    roleDetails.push({ name, status: "created", reason: "Cargo criado com permissões válidas." });
  }

  for (const user of data.users) {
    const username = String(user?.username || user?.login || "").trim();
    const passwordHash = String(user?.passwordHash || "");
    const initialPassword = restoreInitialPassword(user);
    if (!username) {
      counters.users.invalid++;
      skipped++;
      userDetails.push({ username: "sem login", status: "invalid", reason: "Login ausente." });
      continue;
    }
    if (!/^(Admin|[a-z][a-z0-9]+(?:\.[a-z0-9]+)+)$/i.test(username)) {
      counters.users.invalid++;
      skipped++;
      userDetails.push({ username, status: "invalid", reason: "Login incompatível com o formato de usuário." });
      continue;
    }
    if (username.toLocaleLowerCase("pt-BR") === "admin") {
      counters.users.ignored++;
      skipped++;
      userDetails.push({ username, status: "ignored", reason: "Admin preservado e não sobrescrito." });
      continue;
    }

    const roleName = user.roleName || user.cargo;
    const normalizedRoleName = roleName ? normalizeRoleName(String(roleName)) : "";
    const roleId = normalizedRoleName
      ? restoredRoles.get(normalizedRoleName.toLocaleLowerCase("pt-BR")) || null
      : user.roleId
        ? restoredRoleIds.get(Number(user.roleId)) || null
        : null;

    const existingUsers = await storage.getUsers();
    const existing = existingUsers.find((candidate: any) => String(candidate.username).toLocaleLowerCase("pt-BR") === username.toLocaleLowerCase("pt-BR"));
    const hasBcrypt = /^\$2[aby]\$/.test(passwordHash);
    const hasInitialPassword = Boolean(initialPassword);
    const needsGeneratedCredential = !hasBcrypt && !hasInitialPassword;
    const values: any = {
      username,
      role: user.role === "admin" || user.perfil === "admin" ? "admin" : "funcionario",
      fullName: user.fullName || user.nomeCompleto || null,
      birthDate: restoreBirthDate(user, initialPassword),
      status: user.status === "Inativo" || user.status === "inativo" ? "inativo" : "ativo",
    };
    if (roleId) {
      values.roleId = roleId;
      values.jobTitle = user.jobTitle || user.roleLabel || user.cargo || null;
    }

    if (existing) {
      if (existing.role === "admin") {
        counters.users.ignored++;
        skipped++;
        userDetails.push({ username, status: "ignored", reason: "Admin existente preservado." });
        continue;
      }
      await storage.updateUser(existing.id, values);
      counters.users.updated++;
      userDetails.push({ username, status: "updated", reason: "Credencial existente preservada." });
    } else {
      const password = hasBcrypt ? passwordHash : await bcrypt.hash(hasInitialPassword ? initialPassword : temporaryPassword(), BCRYPT_ROUNDS);
      await storage.createUser({
        ...values,
        password,
        mustChangePassword: needsGeneratedCredential || Boolean(user.mustChangePassword),
      });
      counters.users.created++;
      if (needsGeneratedCredential || user.mustChangePassword) counters.users.requiresPasswordReset++;
      userDetails.push({
        username,
        status: needsGeneratedCredential ? "created_requires_password_reset" : "created",
        reason: needsGeneratedCredential ? "Senha não exportável; senha temporária aleatória foi criptografada e exige redefinição pelo administrador." : "Criado com senha inicial válida criptografada.",
      });
    }
  }

  return {
    message: "Usuários e cargos restaurados com segurança.",
    created: counters.users.created,
    updated: counters.users.updated,
    deleted: 0,
    skipped,
    rolesCreated: counters.roles.created,
    rolesUpdated: counters.roles.updated,
    users: counters.users,
    roles: counters.roles,
    warnings,
    details: { users: userDetails, roles: roleDetails },
  };
}
