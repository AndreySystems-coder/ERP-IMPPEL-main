import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { ServiceProgress } from "@/features/work-orders/types";

type ChecklistItem = { key: string; label: string };

type WorkOrderReportOptions = {
  checklistItems?: readonly ChecklistItem[];
  checklistDone?: Record<string, boolean>;
  warranty?: any;
  obraObservations?: string;
};

const NAVY = [30, 58, 138] as [number, number, number];
const ORANGE = [249, 115, 22] as [number, number, number];
const SLATE = [71, 85, 105] as [number, number, number];
const LIGHT = [248, 250, 252] as [number, number, number];
const BORDER = [226, 232, 240] as [number, number, number];
const GREEN = [22, 163, 74] as [number, number, number];
const RED = [220, 38, 38] as [number, number, number];
const BLUE = [37, 99, 235] as [number, number, number];

const MARGIN = 14;
const FOOTER_Y = 287;

function fallback(value?: string | number | null) {
  return value || "-";
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const raw = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  return format(new Date(raw), "dd/MM/yyyy", { locale: ptBR });
}

function lastTableY(doc: jsPDF) {
  return ((doc as any).lastAutoTable?.finalY || 36) + 8;
}

function ensureSpace(doc: jsPDF, y: number, needed = 36) {
  if (y + needed <= FOOTER_Y - 10) return y;
  doc.addPage();
  return 18;
}

function sectionTitle(doc: jsPDF, title: string, y: number) {
  y = ensureSpace(doc, y, 18);
  doc.setFillColor(...LIGHT);
  doc.roundedRect(MARGIN, y - 4, 210 - MARGIN * 2, 9, 2, 2, "F");
  doc.setDrawColor(...BORDER);
  doc.roundedRect(MARGIN, y - 4, 210 - MARGIN * 2, 9, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(title.toUpperCase(), MARGIN + 4, y + 2);
  return y + 8;
}

function brandedHeader(doc: jsPDF, wo: any) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 30, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, 30, 210, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("IMPP", MARGIN, 18);
  doc.setTextColor(...ORANGE);
  doc.text("EL", MARGIN + doc.getTextWidth("IMPP"), 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text("Relatório Final de Ordem de Serviço", MARGIN, 25);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`OS #${wo.id} - ${fallback(wo.clientName)}`, 210 - MARGIN, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 210 - MARGIN, 25, { align: "right" });
}

function addFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFillColor(...NAVY);
    doc.rect(0, FOOTER_Y + 2, 210, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text("IMPPEL Impermeabilização | Av. Dr. Ulisses Guimarães 1296, Sorocaba SP | (15) 99116-5611", MARGIN, FOOTER_Y + 7.5);
    doc.text(`Pág. ${page} / ${pageCount}`, 210 - MARGIN, FOOTER_Y + 7.5, { align: "right" });
  }
}

function addInfoSection(doc: jsPDF, wo: any, options: WorkOrderReportOptions) {
  let y = sectionTitle(doc, "Dados da OS e cliente/obra", 39);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Campo", "Informação"]],
    body: [
      ["Cliente", fallback(wo.clientName)],
      ["Endereço da obra", fallback(wo.address)],
      ["Serviço principal", fallback(wo.serviceType)],
      ["Equipe responsável", fallback(wo.teamAssigned)],
      ["Status", fallback(wo.status)],
      ["Data agendada", wo.scheduledDate ? formatDate(wo.scheduledDate) : "-"],
      ["Observações gerais", fallback(options.obraObservations || wo.obraObservations || wo.notes)],
    ],
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: SLATE, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 48, fontStyle: "bold", fillColor: LIGHT }, 1: { cellWidth: "auto" as const } },
    styles: { lineColor: BORDER, lineWidth: 0.2 },
    alternateRowStyles: { fillColor: [255, 255, 255] },
  });
  return lastTableY(doc);
}

function addProgressSection(doc: jsPDF, progress: ServiceProgress[], y: number) {
  if (progress.length === 0) return y;
  y = sectionTitle(doc, "Serviços executados e progresso", y);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Serviço", "Início", "Fim", "Status", "Observação"]],
    body: progress.map(service => [
      service.serviceName,
      formatDate(service.startDate),
      formatDate(service.endDate),
      service.finished ? "Concluído" : service.started ? "Em andamento" : "Não iniciado",
      service.observations || "-",
    ]),
    styles: { fontSize: 8, lineColor: BORDER, lineWidth: 0.2, cellPadding: 2.5 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 3: { cellWidth: 24 } },
  });
  return lastTableY(doc);
}

function addMaterialsSection(doc: jsPDF, progress: ServiceProgress[], y: number) {
  const materials = progress.flatMap(service => service.realMaterials.map(material => ({ ...material, service: service.serviceName })));
  if (materials.length === 0) return y;

  y = sectionTitle(doc, "Materiais consumidos", y);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Material", "Serviço", "Planejado", "Consumido", "Diferença"]],
    body: materials.map(material => {
      const diff = material.realQty - material.plannedQty;
      return [
        material.name,
        material.service,
        material.plannedQty.toFixed(2),
        material.realQty.toFixed(2),
        diff > 0 ? `+${diff.toFixed(2)}` : diff < 0 ? diff.toFixed(2) : "OK",
      ];
    }),
    styles: { fontSize: 8, lineColor: BORDER, lineWidth: 0.2, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    didParseCell: data => {
      if (data.section === "body" && data.column.index === 4) {
        const value = String(data.cell.raw || "");
        data.cell.styles.textColor = value.startsWith("+") ? RED : value.startsWith("-") ? BLUE : GREEN;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  return lastTableY(doc);
}

function addChecklistAndWarranty(doc: jsPDF, wo: any, y: number, options: WorkOrderReportOptions) {
  const checklistItems = options.checklistItems || [];
  if (checklistItems.length > 0) {
    y = sectionTitle(doc, "Checklist e finalização", y);
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Item", "Status"]],
      body: checklistItems.map(item => [item.label, options.checklistDone?.[item.key] ? "Concluído" : "Pendente"]),
      styles: { fontSize: 8, lineColor: BORDER, lineWidth: 0.2, cellPadding: 2.5 },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 1: { cellWidth: 28, fontStyle: "bold" } },
      didParseCell: data => {
        if (data.section === "body" && data.column.index === 1) {
          data.cell.styles.textColor = data.cell.raw === "Concluído" ? GREEN : RED;
        }
      },
    });
    y = lastTableY(doc);
  }

  const warranty = options.warranty;
  if (warranty || wo.status === "Concluída") {
    y = sectionTitle(doc, "Garantia", y);
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      body: [
        ["Status", warranty ? "Garantia criada" : "Obra concluída"],
        ["Prazo", warranty?.warrantyMonths ? `${warranty.warrantyMonths} meses` : "12 meses"],
        ["Início", formatDate(warranty?.startDate)],
        ["Fim", formatDate(warranty?.endDate)],
      ],
      bodyStyles: { fontSize: 8, textColor: SLATE, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 34, fontStyle: "bold", fillColor: LIGHT } },
      styles: { lineColor: BORDER, lineWidth: 0.2 },
    });
    y = lastTableY(doc);
  }

  return y;
}

function addPhotosSection(doc: jsPDF, photos: any[], y: number) {
  if (photos.length === 0) return y;

  const groups = [
    { label: "ANTES", items: photos.filter(photo => photo.category === "antes") },
    { label: "DURANTE", items: photos.filter(photo => photo.category === "durante") },
    { label: "DEPOIS", items: photos.filter(photo => photo.category === "depois") },
  ];

  y = sectionTitle(doc, "Fotos e registro da execução", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(`Total: ${photos.length} foto(s) | Antes: ${groups[0].items.length} | Durante: ${groups[1].items.length} | Depois: ${groups[2].items.length}`, MARGIN, y);
  y += 6;

  const photoW = 56;
  const photoH = 42;
  const gapX = 5;
  const gapY = 10;

  for (const group of groups) {
    if (group.items.length === 0) continue;
    y = ensureSpace(doc, y, photoH + 16);

    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN, y, 210 - MARGIN * 2, 6, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(group.label, MARGIN + 3, y + 4.3);
    y += 8;

    let col = 0;
    let rowY = y;
    for (const photo of group.items) {
      if (col === 0) rowY = ensureSpace(doc, rowY, photoH + 8);
      const x = MARGIN + col * (photoW + gapX);
      try {
        doc.addImage(photo.data, "JPEG", x, rowY, photoW, photoH);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(photo.timestamp ? new Date(photo.timestamp).toLocaleDateString("pt-BR") : group.label.toLowerCase(), x + 1, rowY + photoH + 3.5);
      } catch {
        doc.setDrawColor(...BORDER);
        doc.rect(x, rowY, photoW, photoH, "S");
        doc.setFontSize(7);
        doc.setTextColor(...SLATE);
        doc.text("Imagem indisponível", x + 4, rowY + 22);
      }

      col++;
      if (col >= 3) {
        col = 0;
        rowY += photoH + gapY;
      }
    }
    y = rowY + photoH + gapY;
  }

  return y;
}

export function generateWorkOrderReportPdf(wo: any, progress: ServiceProgress[], photos: any[], options: WorkOrderReportOptions = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  brandedHeader(doc, wo);
  let y = addInfoSection(doc, wo, options);
  y = addProgressSection(doc, progress, y);
  y = addMaterialsSection(doc, progress, y);
  y = addChecklistAndWarranty(doc, wo, y, options);
  addPhotosSection(doc, photos, y);
  addFooter(doc);

  doc.save(`IMPPEL_OS_${wo.id}_${String(wo.clientName || "cliente").replace(/\s/g, "_")}.pdf`);
}
