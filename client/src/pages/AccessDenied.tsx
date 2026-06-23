import { ShieldX } from "lucide-react";

export default function AccessDenied() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <ShieldX className="mx-auto h-10 w-10 text-slate-400" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Nenhum módulo liberado</h1>
        <p className="mt-2 text-sm text-slate-600">Solicite ao administrador a liberação das áreas necessárias para o seu cargo.</p>
      </div>
    </main>
  );
}
