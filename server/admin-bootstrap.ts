import bcrypt from "bcryptjs";
import type { IStorage } from "./storage";

const BCRYPT_ROUNDS = 10;
const DEFAULT_ADMIN_USERNAME = "Admin";

function isBcryptHash(value: string | null | undefined) {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

export type AdminBootstrapResult = {
  action: "created" | "updated" | "unchanged";
  username: string;
  userId: number;
};

export async function ensureDefaultAdmin(storage: IStorage): Promise<AdminBootstrapResult> {
  const username = process.env.DEFAULT_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME;
  const password = process.env.DEFAULT_ADMIN_PASSWORD || "";

  const users = await storage.getUsers();
  const existing =
    users.find(user => user.username.trim().toLocaleLowerCase("pt-BR") === username.trim().toLocaleLowerCase("pt-BR")) ||
    users.find(user => user.username.trim().toLocaleLowerCase("pt-BR") === "admin");

  if (!existing) {
    if (!password) {
      throw new Error("DEFAULT_ADMIN_PASSWORD must be set before bootstrapping the first Admin user.");
    }

    const created = await storage.createUser({
      username,
      fullName: username,
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
      role: "admin",
      status: "ativo",
      mustChangePassword: false,
    } as any);

    return { action: "created", username: created.username, userId: created.id };
  }

  const updates: Record<string, unknown> = {};
  if (existing.username !== username) updates.username = username;
  if ((existing as any).fullName !== username) updates.fullName = username;
  if (existing.role !== "admin") updates.role = "admin";
  if ((existing as any).status && (existing as any).status !== "ativo") updates.status = "ativo";
  if (!isBcryptHash(existing.password)) {
    updates.password = await bcrypt.hash(existing.password || password, BCRYPT_ROUNDS);
  }

  if (Object.keys(updates).length === 0) {
    return { action: "unchanged", username: existing.username, userId: existing.id };
  }

  const updated = await storage.updateUser(existing.id, updates as any);
  return { action: "updated", username: updated?.username || username, userId: existing.id };
}
