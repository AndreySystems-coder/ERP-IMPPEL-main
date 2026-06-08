import type { Job, Payment, Transaction } from "@shared/schema";

export type FinancialTransaction = Transaction;
export type PaymentRecord = Payment;
export type PaymentJob = Job;

export type PaymentFormState = {
  jobId: string;
  clientName: string;
  amount: string;
  paymentMethod: string;
  status: string;
  notes: string;
};

export type TransactionFormState = {
  type: string;
  category: string;
  amount: string;
  description: string;
};
