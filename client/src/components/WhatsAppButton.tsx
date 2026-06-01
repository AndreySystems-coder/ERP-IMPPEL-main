import React from "react";
import { MessageCircle } from "lucide-react";

interface WhatsAppButtonProps {
  phone: string;
  message?: string;
  clientName?: string;
}

export function WhatsAppButton({ phone, message = "", clientName = "" }: WhatsAppButtonProps) {
  if (!phone) return null;
  
  // Remove non-numeric characters
  const cleanPhone = phone.replace(/\D/g, "");
  const whatsappPhone = cleanPhone.length === 11 ? `55${cleanPhone}` : `55${cleanPhone}`;
  
  // Default messages if none provided
  const messageTemplates = {
    inspection: `Olá ${clientName}! Gostaria de agendar uma inspeção do local para sua obra.`,
    quote: `Olá ${clientName}! Segue em anexo o orçamento para sua obra.`,
    followup: `Olá ${clientName}! Apenas um lembrete sobre sua obra. Como está indo?`,
    completed: `Olá ${clientName}! A sua obra foi concluída com sucesso!`
  };
  
  const finalMessage = message || messageTemplates.inspection;
  const encodedMessage = encodeURIComponent(finalMessage);
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;
  
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-sm font-medium border border-green-200"
      data-testid="button-whatsapp"
    >
      <MessageCircle className="w-4 h-4" />
      WhatsApp
    </a>
  );
}

export const WhatsAppTemplates = {
  inspection: (clientName: string) => `Olá ${clientName}! Gostaria de agendar uma inspeção do local para sua obra.`,
  quote: (clientName: string) => `Olá ${clientName}! Segue em anexo o orçamento para sua obra.`,
  followup: (clientName: string) => `Olá ${clientName}! Apenas um lembrete sobre sua obra. Como está indo?`,
  completed: (clientName: string) => `Olá ${clientName}! A sua obra foi concluída com sucesso!`,
};
