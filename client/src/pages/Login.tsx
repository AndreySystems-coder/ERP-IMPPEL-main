import React, { useState } from "react";
import { useLogin } from "@/hooks/use-auth";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { getDefaultLandingPath } from "@/lib/permissions";


export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login.mutateAsync({ username, password });
      setLocation(getDefaultLandingPath(user));
    } catch (err) {
      // Error handled by mutation
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef4fb] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="login-wave login-wave-one" />
        <div className="login-wave login-wave-two" />
        <div className="login-wave login-wave-three" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(249,115,22,0.11),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(219,234,254,0.72))]" />
      </div>

      <main className="relative z-10 flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <section className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 shadow-2xl shadow-slate-900/10 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative flex min-h-[300px] flex-col justify-between overflow-hidden bg-gradient-to-br from-white via-sky-50 to-blue-100 p-6 sm:min-h-[360px] sm:p-10 lg:min-h-[660px] lg:p-14">
            <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-blue-200/70 blur-3xl" />
            <div className="absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-orange-200/45 blur-3xl" />
            <div className="absolute right-8 top-10 hidden h-28 w-28 rounded-full border border-white/70 bg-white/30 blur-[1px] lg:block" />

            <div className="relative flex items-center justify-between gap-4">
              <div className="text-3xl font-black tracking-tight sm:text-4xl">
                <span className="text-[#1E3A8A]">IMPP</span><span className="text-[#F97316]">EL</span>
              </div>
              <div className="hidden rounded-full border border-blue-100 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-900 shadow-sm sm:block">
                ERP IMPPEL
              </div>
            </div>

            <div className="relative max-w-xl py-6 sm:py-10 lg:py-0">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/70 px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                Gestão integrada para impermeabilização
              </div>
              <h1 className="font-display text-3xl font-bold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Gestão inteligente para obras, materiais e equipes.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600 sm:mt-5 sm:text-lg sm:leading-7">
                Controle orçamentos, ordens de serviço, estoque, financeiro e pós-venda em um só lugar.
              </p>

              <div className="mt-8 hidden gap-3 text-sm font-medium text-slate-700 sm:grid sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-4 py-3 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-[#F97316]" />
                  Operação mobile-first
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-4 py-3 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-[#1E3A8A]" />
                  Fluxo comercial e obra
                </div>
              </div>
            </div>

            <div className="relative flex flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-medium text-slate-500">
                Ambiente seguro para a equipe IMPPEL
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center bg-white/60 p-5 sm:p-8 lg:p-12">
            <div className="w-full max-w-md rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-8 lg:p-10">
              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E3A8A] shadow-lg shadow-blue-950/20">
                  <LockKeyhole className="h-6 w-6 text-white" />
                </div>
                <h2 className="font-display text-3xl font-bold text-slate-950">Entrar no ERP</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Acesse sua conta para continuar a gestão operacional da IMPPEL.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Usuário ou e-mail"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Digite seu usuário"
                  autoComplete="username"
                  className="h-12 border-slate-200 bg-slate-50/80"
                />

                <Input
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  className="h-12 border-slate-200 bg-slate-50/80"
                />

                {login.isError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {login.error.message}
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-2xl bg-[#1E3A8A] text-base font-bold shadow-lg shadow-blue-950/20 hover:bg-[#172f70]"
                  isLoading={login.isPending}
                >
                  Entrar
                  {!login.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>

              <div className="mt-7 rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3 text-center text-xs font-semibold leading-5 text-orange-800">
                Acesso exclusivo para usuários autorizados. Cadastros são liberados pela administração.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
