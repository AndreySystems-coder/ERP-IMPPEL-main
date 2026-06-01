import { useState } from "react";
import { CreditCard, FileText } from "lucide-react";
import PaymentMethods from "./PaymentMethods";
import PaymentConditions from "./PaymentConditions";

type Tab = "formas" | "condicoes";

export default function PagamentosConfig() {
  const [tab, setTab] = useState<Tab>("formas");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Configuração de Pagamentos</h1>
        <p className="text-slate-500 mt-1">
          Gerencie as formas de pagamento aceitas e as condições que aparecem nos PDFs dos orçamentos.
        </p>
      </div>

      <div className="flex gap-2 bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-fit">
        <button
          onClick={() => setTab("formas")}
          data-testid="tab-formas"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === "formas"
              ? "bg-primary text-white shadow"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Formas de Pagamento
        </button>
        <button
          onClick={() => setTab("condicoes")}
          data-testid="tab-condicoes"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === "condicoes"
              ? "bg-primary text-white shadow"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          Condições de Pagamento (PDF)
        </button>
      </div>

      {tab === "formas" ? <PaymentMethods /> : <PaymentConditions />}
    </div>
  );
}
