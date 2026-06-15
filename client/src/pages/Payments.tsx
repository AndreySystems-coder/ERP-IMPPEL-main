import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, DollarSign, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { asArray } from "@/lib/safeData";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { PaymentFilters } from "@/features/financial/components/PaymentFilters";
import { PaymentFormModal } from "@/features/financial/components/PaymentFormModal";
import { PaymentList } from "@/features/financial/components/PaymentList";
import { PaymentsSummaryCards } from "@/features/financial/components/PaymentsSummaryCards";
import type { PaymentFormState, PaymentJob, PaymentRecord } from "@/features/financial/types";
import { formatCurrency, formatDate, getPaymentSearchText, paymentMethodLabels, paymentStatusLabels } from "@/features/financial/utils";

const emptyPaymentForm = (): PaymentFormState => ({
  jobId: "",
  clientName: "",
  amount: "",
  paymentMethod: "transfer",
  status: "completed",
  notes: "",
});

export default function Payments() {
  const { toast } = useToast();
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<PaymentRecord[]>({ queryKey: ["/api/payments"] });
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<PaymentJob[]>({ queryKey: ["/api/jobs"] });
  const paymentsList = asArray<PaymentRecord>(payments);
  const jobsList = asArray<PaymentJob>(jobs);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [form, setForm] = useState<PaymentFormState>(emptyPaymentForm());

  const createPayment = useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiRequest("POST", "/api/payments", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Pagamento registrado!" });
      closeModal();
    },
    onError: (error: any) => toast({ title: "Erro ao registrar pagamento", description: error?.message, variant: "destructive" }),
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const response = await apiRequest("PATCH", `/api/payments/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Pagamento atualizado!" });
      closeModal();
    },
    onError: (error: any) => toast({ title: "Erro ao atualizar pagamento", description: error?.message, variant: "destructive" }),
  });

  const deletePayment = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Pagamento removido." });
    },
    onError: (error: any) => toast({ title: "Erro ao remover pagamento", description: error?.message, variant: "destructive" }),
  });

  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return paymentsList.filter(payment => {
      const matchesSearch = !term || getPaymentSearchText(payment).includes(term);
      const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
      const matchesMethod = methodFilter === "all" || payment.paymentMethod === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [methodFilter, paymentsList, search, statusFilter]);

  const openNew = () => {
    setEditingPayment(null);
    setForm(emptyPaymentForm());
    setIsModalOpen(true);
  };

  const openEdit = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setForm({
      jobId: String(payment.jobId),
      clientName: payment.clientName,
      amount: String(payment.amount),
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      notes: payment.notes || "",
    });
    setIsModalOpen(true);
  };

  function closeModal() {
    setIsModalOpen(false);
    setEditingPayment(null);
    setForm(emptyPaymentForm());
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const selectedJob = jobsList.find(job => job.id === Number(form.jobId));
    if (!selectedJob) {
      toast({
        title: "Selecione um orçamento",
        description: "Para evitar pagamento solto, vincule o pagamento a um orçamento do cliente.",
        variant: "destructive",
      });
      return;
    }
    const payload = {
      jobId: selectedJob.id,
      clientName: selectedJob.clientName || form.clientName || editingPayment?.clientName || "",
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod,
      status: form.status,
      notes: form.notes,
    };

    if (editingPayment) {
      await updatePayment.mutateAsync({ id: editingPayment.id, ...payload });
      return;
    }

    await createPayment.mutateAsync(payload);
  };

  const handleExport = (formatType: "csv" | "pdf") => {
    const exportData = filteredPayments.map(payment => ({
      ID: payment.id,
      Cliente: payment.clientName,
      Valor: formatCurrency(payment.amount),
      Método: paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod,
      Status: paymentStatusLabels[payment.status] || payment.status,
      Data: formatDate(payment.date),
      Notas: payment.notes || "",
    }));

    if (formatType === "csv") exportToCSV(exportData, "pagamentos");
    else exportToPDF(exportData, "Pagamentos");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            Pagamentos
          </h1>
          <p className="mt-1 text-sm text-slate-500">Controle de pagamentos vinculados aos orçamentos.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} className="min-h-10 gap-2" data-testid="button-export-payments-csv">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} className="min-h-10 gap-2" data-testid="button-export-payments-pdf">
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button onClick={openNew} className="min-h-10 gap-2 bg-blue-700 text-white hover:bg-blue-800" data-testid="button-new-payment">
            <Plus className="h-4 w-4" />
            Novo pagamento
          </Button>
        </div>
      </div>

      <PaymentsSummaryCards payments={payments} />
      <PaymentFilters
        search={search}
        status={statusFilter}
        method={methodFilter}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onMethodChange={setMethodFilter}
      />
      <PaymentList
        payments={filteredPayments}
        isLoading={paymentsLoading}
        onEdit={openEdit}
        onDelete={payment => deletePayment.mutate(payment.id)}
      />

      <PaymentFormModal
        open={isModalOpen}
        payment={editingPayment}
        form={form}
        jobs={jobs}
        isSaving={createPayment.isPending || updatePayment.isPending || jobsLoading}
        onClose={closeModal}
        onChange={setForm}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
