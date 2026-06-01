import React, { useState } from "react";
import { useLogin } from "@/hooks/use-auth";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Building2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ username, password });
      setLocation("/");
    } catch (err) {
      // Error handled by mutation
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 mb-6">
              <Building2 className="text-white w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold font-display tracking-tight text-slate-900">
              Bem-vindo de volta
            </h2>
            <p className="mt-2 text-sm text-slate-600 font-medium">
              Entre no IMPPEL ERP para gerenciar seu negócio.
            </p>
          </div>

          <div className="mt-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Usuário"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Digite seu usuário"
              />

              <Input
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />

              {login.isError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20">
                  {login.error.message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full py-3 text-lg"
                isLoading={login.isPending}
              >
                Entrar
              </Button>
            </form>
          </div>
        </div>
      </div>
      
      <div className="hidden lg:block relative w-0 flex-1">
        {/* landing page hero scenic construction architecture */}
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="https://pixabay.com/get/g57c9ead3e2510c23f464fd322d8aaa5b8543382b34fe46dedba07e6384eb6b8526a72d347adad30cda33cf03fcb6c2eb001b1ac7beb93625be2b39ea1c6e582e_1280.jpg"
          alt="Construction building"
        />
        <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h1 className="text-4xl font-display font-bold mb-4">Construa o futuro com precisão.</h1>
          <p className="text-lg text-slate-300 max-w-xl">
            Otimize suas operações, estime perfeitamente e acompanhe seus projetos de construção do lead à conclusão.
          </p>
        </div>
      </div>
    </div>
  );
}
