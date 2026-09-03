import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Erro não tratado na interface:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Algo deu errado nesta tela</h1>
            <p className="mt-2 text-sm text-slate-500">
              A tela travou por um erro inesperado. Recarregue a página — se continuar acontecendo, avise o administrador com a mensagem abaixo.
            </p>
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-left font-mono text-xs text-slate-600 break-words">
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              <RefreshCcw className="h-4 w-4" /> Recarregar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
