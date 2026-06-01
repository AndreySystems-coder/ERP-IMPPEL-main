import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useLocation } from "wouter";
import { AlertCircle } from "lucide-react";

export default function MobileLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (creds: { username: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erro ao fazer login");
      }
      return res.json();
    },
    onSuccess: () => {
      setLocation("/mobile/jobs");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    await loginMutation.mutateAsync({ username, password });
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-white">IMPPEL</h1>
          <p className="text-primary-100 mt-2">App de Campo</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">Login</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Usuário"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Seu usuário"
              required
              data-testid="input-mobile-username"
              autoComplete="username"
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              required
              data-testid="input-mobile-password"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold"
              isLoading={loginMutation.isPending}
              data-testid="button-mobile-login"
            >
              Entrar
            </Button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-4">
            Acesso exclusivo para equipes de campo IMPPEL
          </p>
        </div>
      </div>
    </div>
  );
}
