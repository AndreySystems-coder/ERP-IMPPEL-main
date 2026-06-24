import { useUser } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { canAccessAny, getDefaultLandingPath, permissionsForPath } from "@/lib/permissions";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LockKeyhole } from "lucide-react";

function InitialPasswordGate({ user, children }: { user: any; children: React.ReactNode }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user?.mustChangePassword) return <>{children}</>;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("A nova senha deve ter pelo menos 8 caracteres.");
    if (password !== confirmation) return setError("As senhas não coincidem.");
    setSaving(true);
    try {
      await apiRequest("POST", "/api/auth/change-initial-password", { newPassword: password });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err: any) {
      setError(err.message || "Não foi possível alterar a senha.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-900 text-white"><LockKeyhole className="h-5 w-5" /></div>
          <div><h1 className="text-xl font-bold text-slate-900">Crie sua senha definitiva</h1><p className="text-sm text-slate-500">A senha inicial não poderá ser usada novamente.</p></div>
        </div>
        <Input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Nova senha (mínimo 8 caracteres)" autoComplete="new-password" />
        <Input type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Confirmar nova senha" autoComplete="new-password" />
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={saving} className="w-full bg-blue-900 text-white">{saving ? "Salvando..." : "Salvar senha e acessar o ERP"}</Button>
      </form>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();
  const [location, setLocation] = useLocation();
  const routePermissions = permissionsForPath(location);
  const allowed = !!user && (routePermissions.length === 0 || user.role === "admin" || canAccessAny(user as any, routePermissions));

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else if (!allowed) {
        setLocation(getDefaultLandingPath(user as any));
      }
    }
  }, [user, isLoading, allowed, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !allowed) return null;

  return <InitialPasswordGate user={user}>{children}</InitialPasswordGate>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();
  const [location, setLocation] = useLocation();
  const allowed = !!user && (user.role === "admin" || canAccessAny(user as any, permissionsForPath(location)));

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else if (!allowed) {
        setLocation(getDefaultLandingPath(user as any));
      }
    }
  }, [user, isLoading, allowed, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !allowed) return null;

  return <InitialPasswordGate user={user}>{children}</InitialPasswordGate>;
}
