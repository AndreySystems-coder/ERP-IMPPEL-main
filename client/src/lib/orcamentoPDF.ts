import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── QuoteTemplateConfig — defined here to avoid circular imports ──────────────
export interface QuoteTemplateConfig {
  margins: { left: number };
  columns: { item: number; desc: number; unid: number; qtde: number; unit: number; total: number };
  clientColumns: { nome: number; cargo: number; telefone: number };
  fontSize: { header: number; body: number; totals: number; date: number };
  rowPadding: { top: number; bottom: number };
  sectionPadding: { top: number; bottom: number };
  headerColor: string;
  totalsColor: string;
  sections: {
    showClientes: boolean;
    showResponsaveis: boolean;
    showPaymentConditions: boolean;
    showObservacoes: boolean;
    showObservacoesPadrao: boolean;
  };
}

// ── Brand colors ──────────────────────────────────────────────────────────────
const AZUL        = "#1E3A8A";
const LARANJA     = "#F97316";
const CINZA_TEXTO = "#374151";
const CINZA_LIGHT = "#F8FAFC";
const CINZA_BORDA = "#E2E8F0";
const BRANCO      = "#FFFFFF";
const CINZA_HEADER= "#F1F5F9";

export const DEFAULT_PDF_CONFIG: QuoteTemplateConfig = {
  margins: { left: 11 },
  columns: { item: 12, desc: 87, unid: 14, qtde: 25, unit: 25, total: 25 },
  clientColumns: { nome: 68, cargo: 32, telefone: 28 },
  fontSize: { header: 9, body: 8.5, totals: 9, date: 9.5 },
  rowPadding: { top: 5, bottom: 5 },
  sectionPadding: { top: 2, bottom: 2 },
  headerColor: "#1E3A8A",
  totalsColor: "#F97316",
  sections: {
    showClientes: true,
    showResponsaveis: true,
    showPaymentConditions: true,
    showObservacoes: true,
    showObservacoesPadrao: true,
  },
};

export function mergeQuoteTemplateConfig(config?: Partial<QuoteTemplateConfig> | null): QuoteTemplateConfig {
  const saved = config ?? {};

  return {
    ...DEFAULT_PDF_CONFIG,
    ...saved,
    margins: { ...DEFAULT_PDF_CONFIG.margins, ...(saved.margins || {}) },
    columns: { ...DEFAULT_PDF_CONFIG.columns, ...(saved.columns || {}) },
    clientColumns: { ...DEFAULT_PDF_CONFIG.clientColumns, ...(saved.clientColumns || {}) },
    fontSize: { ...DEFAULT_PDF_CONFIG.fontSize, ...(saved.fontSize || {}) },
    rowPadding: { ...DEFAULT_PDF_CONFIG.rowPadding, ...(saved.rowPadding || {}) },
    sectionPadding: { ...DEFAULT_PDF_CONFIG.sectionPadding, ...(saved.sectionPadding || {}) },
    sections: { ...DEFAULT_PDF_CONFIG.sections, ...(saved.sections || {}) },
  };
}

export interface ServiceItemPDF {
  lugar?: string;
  name: string;
  description?: string;
  area: number;
  unitPrice: number;
  total: number;
}

export interface ClientePDF {
  nome: string;
  cargo: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
}

export interface ResponsavelPDF {
  nome: string;
  cargo: string;
  telefone?: string;
}

export type MaterialDisplayMode = "material_mdo" | "mdo_lista" | "material_separado";

export interface OrcamentoPDFData {
  id?: number;
  orcamentoNumero?: number; // custom override number (shown instead of id if set)
  // Legacy single-client fields (backward compat)
  cliente: string;
  clientePhone?: string;
  clienteEndereco?: string;
  clienteCidade?: string;
  // New multi-client array
  clientes?: ClientePDF[];
  // Responsáveis
  responsaveis?: ResponsavelPDF[];
  encarregado?: string; // backward compat
  servico: string;
  areaM2: number;
  serviceItems?: ServiceItemPDF[];
  materialCost: number;
  laborCost: number;
  transportCost: number;
  directCost: number;
  finalPrice: number;
  margin: number;
  observacoes?: string;
  dataOrcamento?: string;
  regiaoLocalizacao?: string;
  // Dynamic payment conditions from database
  paymentConditions?: { name: string; fullText: string }[];
  // PDF presentation modes
  materialDisplayMode?: MaterialDisplayMode;  // default: "material_mdo"
  showMaterialsToClient?: boolean;            // default: true
}

function fmtBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hex2rgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function setFill(doc: jsPDF, hex: string) { doc.setFillColor(...hex2rgb(hex)); }
function setDraw(doc: jsPDF, hex: string) { doc.setDrawColor(...hex2rgb(hex)); }
function setTxt(doc: jsPDF, hex: string)  { doc.setTextColor(...hex2rgb(hex)); }

// ─────────────────────────────────────────────────────────────────────────────
// Standard observações clauses
// ─────────────────────────────────────────────────────────────────────────────
const OBSERVACOES_PADRAO = [
  "SE FAZ NECESSÁRIA A REGULARIZAÇÃO DA ÁREA A SER FEITA A IMPERMEABILIZAÇÃO, POR CONTA DO PROPRIETÁRIO; NÃO NOS RESPONSABILIZAMOS POR ESSA PARTE.",
  "GARANTIMOS NOSSOS SERVIÇOS POR UM PERÍODO DE 05 (CINCO) ANOS, COMO PRESCREVE O CÓDIGO CIVIL BRASILEIRO. DURANTE ESSE PERÍODO COMPROMETEMO-NOS A REPARAR GRATUITAMENTE OS DEFEITOS QUE SEJAM TECNICAMENTE CONSTATADOS COMO FALHA DA CONTRATADA.",
  "A GARANTIA DOS SERVIÇOS TAMBÉM SERÁ ANULADA SE OCORREREM DANOS APÓS O TÉRMINO DA IMPERMEABILIZAÇÃO E SE OCORREREM DANOS FUTUROS PROVOCADOS POR RECALQUES, FALHAS ESTRUTURAIS, CARGAS MAL DISTRIBUÍDAS, INFILTRAÇÕES DE SOLVENTES E FENÔMENOS FÍSICOS OU QUÍMICOS QUE DESTRUAM OS MATERIAIS APLICADOS OU ABALEM A ESTABILIDADE DAS SUPERFÍCIES IMPERMEABILIZADAS, CONFORME NORMA.",
  "SERÁ EXECUTADO O TESTE DE ESTANQUIDADE COM A SUPERVISÃO DA CONTRATADA JUNTO AO ENCARREGADO DA OBRA.",
  "A GARANTIA LIMITA-SE AO VALOR DOS SERVIÇOS.",
  "PROPOSTA VÁLIDA POR 30 DIAS.",
];

export function gerarOrcamentoPDF(data: OrcamentoPDFData, templateConfig?: QuoteTemplateConfig) {
  const cfg = templateConfig ?? DEFAULT_PDF_CONFIG;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW   = doc.internal.pageSize.getWidth();
  const pageH   = doc.internal.pageSize.getHeight();
  const mL      = cfg.margins.left;
  const mR      = pageW - mL;
  const contentW = pageW - mL * 2;
  // Shadow module-level color constants with template config values
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const AZUL = cfg.headerColor;
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const LARANJA = cfg.totalsColor;
  let y = 0;

  // ───────────────────────────────────────────────────────────────────────────
  // CABEÇALHO
  // ───────────────────────────────────────────────────────────────────────────
  const headerH = 54;
  setFill(doc, AZUL);
  doc.rect(0, 0, pageW, headerH, "F");
  setFill(doc, LARANJA);
  doc.rect(0, 0, pageW, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  setTxt(doc, BRANCO);
  doc.text("IMPP", mL, 25);
  const imppW = doc.getTextWidth("IMPP");
  setTxt(doc, LARANJA);
  doc.text("EL", mL + imppW, 25);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setTxt(doc, BRANCO);
  doc.text("PROPOSTA COMERCIAL", mL, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTxt(doc, "#93C5FD");
  doc.text("Impermeabilização Profissional", mL, 36);

  const contactLines = [
    "TEL.: (015) 3302-2397   |   WHATS: (015) 99116-5611",
    "E-MAIL: vendas@imppel.com.br",
    "Av. Dr. Ulisses Guimarães, 1296 - Pq. Laranjeiras - Sorocaba / SP",
  ];
  doc.setFontSize(8);
  setTxt(doc, "#CBD5E1");
  let cy = 20;
  contactLines.forEach(line => {
    doc.text(line, mR, cy, { align: "right" });
    cy += 7;
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTxt(doc, BRANCO);
  doc.text("Especialistas em manta asfaltica e impermeabilizacao", mR, 44, { align: "right" });

  // ───────────────────────────────────────────────────────────────────────────
  // FAIXA "ORÇAMENTO Nº / DATA"
  // ───────────────────────────────────────────────────────────────────────────
  y = headerH;
  setFill(doc, "#F8FAFC");
  setDraw(doc, CINZA_BORDA);
  doc.setLineWidth(0.25);
  doc.rect(0, y, pageW, 16, "F");

  const dataFormatada = data.dataOrcamento || new Date().toLocaleDateString("pt-BR");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  setTxt(doc, AZUL);
  const displayNum = data.orcamentoNumero ?? data.id;
  const numStr = displayNum ? `Orçamento Nº: ${String(displayNum).padStart(4, "0")}` : "Orçamento";
  doc.text(numStr, mL, y + 6.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setTxt(doc, "#64748B");
  doc.text("Documento preparado para analise e aprovacao do cliente", mL, y + 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(cfg.fontSize.date);
  setTxt(doc, AZUL);
  doc.text(dataFormatada, mR, y + 6.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setTxt(doc, "#64748B");
  doc.text("Validade: 30 dias", mR, y + 12, { align: "right" });
  y += 19;

  setFill(doc, "#FFFFFF");
  setDraw(doc, CINZA_BORDA);
  doc.setLineWidth(0.25);
  doc.roundedRect(mL, y, contentW, 20, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setTxt(doc, "#64748B");
  doc.text("CLIENTE", mL + 5, y + 6);
  doc.text("SERVICO", mL + 55, y + 6);
  doc.text("AREA", mL + 122, y + 6);
  doc.text("VALOR TOTAL", mR - 5, y + 6, { align: "right" });
  doc.setFontSize(9);
  setTxt(doc, CINZA_TEXTO);
  doc.text(doc.splitTextToSize(data.cliente || "-", 45)[0], mL + 5, y + 14);
  doc.text(doc.splitTextToSize(data.servico || "-", 62)[0], mL + 55, y + 14);
  doc.text(`${(data.areaM2 || 0).toLocaleString("pt-BR")} m2`, mL + 122, y + 14);
  doc.setFontSize(10);
  setTxt(doc, LARANJA);
  doc.text(fmtBRL(data.finalPrice || 0), mR - 5, y + 14, { align: "right" });
  y += 26;

  // ───────────────────────────────────────────────────────────────────────────
  // CLIENTES / PARTES ENVOLVIDAS
  // ───────────────────────────────────────────────────────────────────────────
  // Build client list: prefer new `clientes` array, fall back to legacy fields
  const clientList: ClientePDF[] = (() => {
    if (data.clientes && data.clientes.length > 0) {
      return data.clientes.filter(c => c.nome.trim());
    }
    // Backward compat: build from single client legacy fields
    if (data.cliente) {
      return [{
        nome: data.cliente,
        cargo: "Proprietário",
        telefone: data.clientePhone || "",
        endereco: data.clienteEndereco || "",
        cidade: data.clienteCidade || data.regiaoLocalizacao || "",
      }];
    }
    return [];
  })();

  if (clientList.length > 0 && cfg.sections.showClientes) {
    const clientBody = clientList.map(c => {
      const loc = [c.endereco, c.cidade].filter(Boolean).join(", ");
      return [c.nome, c.cargo, c.telefone || "—", loc || "—"];
    });

    const CC = cfg.clientColumns ?? { nome: 68, cargo: 32, telefone: 28 };
    const enderecoW = Math.max(20, contentW - CC.nome - CC.cargo - CC.telefone);
    const spTop = (cfg.sectionPadding?.top ?? 2);
    const spBot = (cfg.sectionPadding?.bottom ?? 2);
    autoTable(doc, {
      startY: y,
      margin: { left: mL, right: mL },
      head: [["NOME / PARTE ENVOLVIDA", "CARGO / PAPEL", "TELEFONE", "ENDEREÇO / CIDADE"]],
      body: clientBody,
      headStyles: {
        fillColor: hex2rgb(AZUL),
        textColor: hex2rgb(BRANCO),
        fontStyle: "bold",
        fontSize: cfg.fontSize.header,
        cellPadding: { top: spTop, bottom: spBot, left: 4, right: 4 },
      },
      bodyStyles: {
        fontSize: cfg.fontSize.body,
        textColor: hex2rgb(CINZA_TEXTO),
        cellPadding: { top: spTop, bottom: spBot, left: 4, right: 4 },
        overflow: "linebreak" as const,
      },
      alternateRowStyles: {
        fillColor: hex2rgb(CINZA_LIGHT),
      },
      styles: {
        lineColor: hex2rgb(CINZA_BORDA),
        lineWidth: 0.2,
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: CC.nome },
        1: { cellWidth: CC.cargo },
        2: { cellWidth: CC.telefone },
        3: { cellWidth: enderecoW },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RESPONSÁVEIS / EQUIPE TÉCNICA
  // ───────────────────────────────────────────────────────────────────────────
  const respList: ResponsavelPDF[] = (() => {
    if (data.responsaveis && data.responsaveis.length > 0) {
      return data.responsaveis.filter(r => r.nome.trim());
    }
    if (data.encarregado && data.encarregado.trim()) {
      return [{ nome: data.encarregado, cargo: "Encarregado", telefone: "" }];
    }
    return [];
  })();

  if (respList.length > 0 && cfg.sections.showResponsaveis) {
    const respBody = respList.map(r => [r.nome, r.cargo, r.telefone || "—"]);
    const spTop2 = (cfg.sectionPadding?.top ?? 2);
    const spBot2 = (cfg.sectionPadding?.bottom ?? 2);

    autoTable(doc, {
      startY: y,
      margin: { left: mL, right: mL },
      head: [["RESPONSÁVEL / EQUIPE TÉCNICA", "CARGO / FUNÇÃO", "TELEFONE"]],
      body: respBody,
      headStyles: {
        fillColor: hex2rgb(AZUL),
        textColor: hex2rgb(BRANCO),
        fontStyle: "bold",
        fontSize: cfg.fontSize.header,
        cellPadding: { top: spTop2, bottom: spBot2, left: 4, right: 4 },
      },
      bodyStyles: {
        fontSize: cfg.fontSize.body,
        textColor: hex2rgb(CINZA_TEXTO),
        cellPadding: { top: spTop2, bottom: spBot2, left: 4, right: 4 },
        overflow: "linebreak" as const,
      },
      alternateRowStyles: {
        fillColor: hex2rgb(CINZA_LIGHT),
      },
      styles: {
        lineColor: hex2rgb(CINZA_BORDA),
        lineWidth: 0.2,
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: contentW - 88 },
        1: { cellWidth: 58 },
        2: { cellWidth: 30 },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 6;
  } else {
    y += 4;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TABELA DE SERVIÇOS — suporte a 3 modos de apresentação
  // ───────────────────────────────────────────────────────────────────────────
  const allItems: ServiceItemPDF[] = data.serviceItems && data.serviceItems.length > 0
    ? data.serviceItems
    : [{ name: data.servico, area: data.areaM2, unitPrice: 0, total: data.finalPrice }];

  const subtotalVal = allItems.reduce((s, i) => s + i.total, 0);
  const totalFinal  = data.finalPrice > 0 ? data.finalPrice : subtotalVal;

  // Column widths from template config
  const COL = cfg.columns;

  // ── Determine display mode ────────────────────────────────────────────────
  const displayMode: MaterialDisplayMode = data.materialDisplayMode ?? "material_mdo";
  const showPrices = data.showMaterialsToClient !== false;

  // In "mdo_lista" or when hiding materials, omit price columns from the table
  const hidePriceCols = displayMode === "mdo_lista" || !showPrices;

  // When price cols are hidden, desc column expands to fill
  // contentW = item + desc + unid + qtde + [unit + total if shown]
  const descWidthExpanded = contentW - COL.item - COL.unid - COL.qtde;
  const descWidthNormal   = COL.desc;
  const descW = hidePriceCols ? descWidthExpanded : descWidthNormal;

  // ── Pre-build per-row data for the didDrawCell bold-prefix hook ───────────
  const lugarByRow: string[] = [];
  const combinedByRow: string[] = [];

  const tableRows: any[] = [];
  allItems.forEach((item, idx) => {
    const bg: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];

    const nameUpper = item.name.toUpperCase();
    const combined = item.description?.trim()
      ? `${nameUpper} - ${item.description.trim()}`
      : nameUpper;

    const lugar = (item.lugar?.trim() || "").toUpperCase();
    const fullContent = lugar ? `${lugar} - ${combined}` : combined;

    lugarByRow.push(lugar);
    combinedByRow.push(combined);

    const row: any[] = [
      {
        content: String(idx + 1),
        styles: { fillColor: bg, fontStyle: "bold" as const, halign: "center" as const, valign: "middle" as const },
      },
      {
        content: fullContent,
        styles: {
          fillColor: bg,
          halign: "left" as const,
          valign: "top" as const,
          overflow: "linebreak" as const,
          lineHeightFactor: 1.4,
          fontSize: 7.5,
          cellPadding: { top: 3, bottom: 3, left: 4, right: 3 },
        },
      },
      {
        content: "M²",
        styles: { fillColor: bg, halign: "center" as const, valign: "middle" as const },
      },
      {
        content: item.area > 0
          ? item.area.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
          : "—",
        styles: { fillColor: bg, halign: "center" as const, valign: "middle" as const },
      },
    ];

    if (!hidePriceCols) {
      row.push(
        {
          content: item.unitPrice > 0 ? fmtBRL(item.unitPrice) : "—",
          styles: { fillColor: bg, halign: "right" as const, valign: "middle" as const },
        },
        {
          content: fmtBRL(item.total),
          styles: { fillColor: bg, halign: "right" as const, valign: "middle" as const, fontStyle: "bold" as const },
        },
      );
    }

    tableRows.push(row);
  });

  const textColorRgb = hex2rgb(CINZA_TEXTO);

  const tableHead = hidePriceCols
    ? [["ITEM", "DESCRIÇÃO DE SERVIÇOS E MATERIAIS", "UNID.", "QUANTIDADE"]]
    : [["ITEM", "DESCRIÇÃO DE SERVIÇOS", "UNID.", "QUANTIDADE", "UNITÁRIO", "TOTAL"]];

  const tableColStyles: Record<number, any> = {
    0: { halign: "center", cellWidth: COL.item },
    1: { halign: "left",   cellWidth: descW },
    2: { halign: "center", cellWidth: COL.unid },
    3: { halign: "center", cellWidth: COL.qtde },
  };
  if (!hidePriceCols) {
    tableColStyles[4] = { halign: "right", cellWidth: COL.unit };
    tableColStyles[5] = { halign: "right", cellWidth: COL.total };
  }

  autoTable(doc, {
    startY: y,
    margin: { left: mL, right: mL },
    head: tableHead,
    body: tableRows,
    headStyles: {
      fillColor: hex2rgb(AZUL),
      textColor: hex2rgb(BRANCO),
      fontStyle: "bold",
      fontSize: cfg.fontSize.header,
      cellPadding: { top: cfg.rowPadding.top, bottom: cfg.rowPadding.bottom, left: 2, right: 2 },
      halign: "center",
      overflow: "linebreak",
    },
    bodyStyles: {
      fontSize: cfg.fontSize.body,
      textColor: textColorRgb,
      cellPadding: { top: cfg.rowPadding.top, bottom: cfg.rowPadding.bottom, left: 3, right: 3 },
      overflow: "linebreak",
      lineHeightFactor: 1.45,
    } as any,
    styles: { lineColor: hex2rgb(CINZA_BORDA), lineWidth: 0.25, overflow: "linebreak" },
    columnStyles: tableColStyles,
    willDrawCell: (hookData: any) => {
      if (hookData.section !== "body" || hookData.column.index !== 1) return;
      if (!lugarByRow[hookData.row.index]) return;
      hookData.cell.text = [];
    },
    didDrawCell: (hookData: any) => {
      if (hookData.section !== "body" || hookData.column.index !== 1) return;
      const rowIdx = hookData.row.index;
      const lugar = lugarByRow[rowIdx];
      if (!lugar) return;

      const { x, y: cellY, width } = hookData.cell;
      const padL = 4, padT = 3, padR = 3;
      const textX = x + padL;
      const maxTextW = width - padL - padR;

      doc.setFontSize(7.5);
      doc.setTextColor(textColorRgb[0], textColorRgb[1], textColorRgb[2]);

      const fsz = 7.5 / doc.internal.scaleFactor;
      const lineH = fsz * 1.4;
      const baselineY = cellY + padT + fsz;

      const lugarPrefix = lugar + " - ";
      doc.setFont("helvetica", "bold");
      const prefW = doc.getTextWidth(lugarPrefix);
      doc.text(lugarPrefix, textX, baselineY);

      doc.setFont("helvetica", "normal");
      const combined = combinedByRow[rowIdx];
      const firstLineRemainingW = maxTextW - prefW;
      const firstLineWords = doc.splitTextToSize(combined, firstLineRemainingW);
      const firstLine: string = firstLineWords[0] || "";

      if (firstLine) doc.text(firstLine, textX + prefW, baselineY);

      const afterFirst = combined.substring(firstLine.length).trim();
      if (afterFirst) {
        const remainingLines: string[] = doc.splitTextToSize(afterFirst, maxTextW);
        remainingLines.forEach((line: string, i: number) => {
          doc.text(line, textX, baselineY + (i + 1) * lineH);
        });
      }

      doc.setFont("helvetica", "normal");
    },
  });

  // ── Barras de TOTAL (após a tabela) ───────────────────────────────────────
  const tableEndY = (doc as any).lastAutoTable.finalY;
  const totalBarH = 11;

  // For hidden-price table: label spans full width except last segment
  // For normal table: same layout as before (item+desc+unid+qtde+unit | total)
  const totalLabelW = hidePriceCols
    ? contentW - 35
    : COL.item + COL.desc + COL.unid + COL.qtde + COL.unit;
  const totalPriceW = hidePriceCols ? 35 : COL.total;

  // ── Helper to draw a single total bar ────────────────────────────────────
  const drawTotalBar = (startY: number, labelText: string, valueText: string, labelColor: string, valueColor: string) => {
    setFill(doc, labelColor);
    setDraw(doc, CINZA_BORDA);
    doc.setLineWidth(0.25);
    doc.rect(mL, startY, totalLabelW, totalBarH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(cfg.fontSize.totals);
    setTxt(doc, BRANCO);
    doc.text(labelText, mL + totalLabelW - 4, startY + totalBarH / 2 + 1.5, { align: "right" });
    setFill(doc, valueColor);
    doc.rect(mL + totalLabelW, startY, totalPriceW, totalBarH, "F");
    doc.setFontSize(cfg.fontSize.totals);
    setTxt(doc, BRANCO);
    doc.text(valueText, mL + totalLabelW + totalPriceW - 2, startY + totalBarH / 2 + 1.5, { align: "right" });
    setDraw(doc, CINZA_BORDA);
    doc.setLineWidth(0.25);
    doc.rect(mL, startY, contentW, totalBarH, "S");
  };

  // ── Compute material/labor client-facing values for Mode 3 ───────────────
  const dc = data.directCost > 0 ? data.directCost : (data.materialCost + data.laborCost + data.transportCost);
  let materialClientValue = 0;
  let laborClientValue = totalFinal;
  if (dc > 0 && data.materialCost > 0) {
    materialClientValue = Math.round((totalFinal * data.materialCost / dc) * 100) / 100;
    laborClientValue = Math.round((totalFinal - materialClientValue) * 100) / 100;
  }

  // ── Draw totals based on mode ─────────────────────────────────────────────
  if (showPrices && displayMode === "material_separado" && dc > 0 && materialClientValue > 0) {
    // Mode 3: stacked bars — MATERIAIS | MÃO DE OBRA | TOTAL GERAL
    const CINZA_AZULADO = "#475569";
    drawTotalBar(tableEndY,                     "MATERIAIS",   fmtBRL(materialClientValue), CINZA_AZULADO, "#334155");
    drawTotalBar(tableEndY + totalBarH,         "MÃO DE OBRA", fmtBRL(laborClientValue),   CINZA_AZULADO, "#334155");
    drawTotalBar(tableEndY + totalBarH * 2,     "TOTAL GERAL", fmtBRL(totalFinal),          AZUL,          LARANJA);
    y = tableEndY + totalBarH * 3 + 10;
  } else {
    // Mode 1 (or mode 3 without cost data, or showPrices=false): single TOTAL GERAL bar
    const label = displayMode === "mdo_lista" && showPrices ? "MÃO DE OBRA / VALOR DO SERVIÇO" : "TOTAL GERAL";
    drawTotalBar(tableEndY, label, fmtBRL(totalFinal), AZUL, LARANJA);
    y = tableEndY + totalBarH + 10;
  }

  // ── Seção "MATERIAIS NECESSÁRIOS" — apenas no Modo 2 com showMaterials=true ──
  if (displayMode === "mdo_lista" && showPrices && allItems.length > 0) {
    const AZUL_CLARO_FILL = "#EFF6FF";
    const AZUL_CLARO_BORDA = "#BFDBFE";
    const AZUL_TEXTO = "#1E40AF";
    const AZUL_ITEM  = "#1D4ED8";

    const matLines: string[] = [];
    allItems.forEach((item, idx) => {
      const lugar = item.lugar?.trim() ? item.lugar.trim().toUpperCase() + " — " : "";
      const name = item.name.toUpperCase();
      const desc = item.description?.trim() ? `: ${item.description.trim()}` : "";
      const area = item.area > 0 ? ` (${item.area.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} m²)` : "";
      matLines.push(`${idx + 1}. ${lugar}${name}${desc}${area}`);
    });

    const lineHMat = 5.5;
    const boxH = 12 + matLines.length * lineHMat + 4;

    if (y + boxH > pageH - 32) { doc.addPage(); y = 18; }

    setFill(doc, AZUL_CLARO_FILL);
    setDraw(doc, AZUL_CLARO_BORDA);
    doc.setLineWidth(0.3);
    doc.roundedRect(mL, y, contentW, boxH, 2, 2, "FD");

    // left accent bar
    setFill(doc, AZUL_ITEM);
    doc.roundedRect(mL, y, 3, boxH, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setTxt(doc, AZUL_TEXTO);
    doc.text("MATERIAIS NECESSÁRIOS PARA A EXECUÇÃO", mL + 7, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setTxt(doc, CINZA_TEXTO);
    matLines.forEach((line, i) => {
      const wrapped = doc.splitTextToSize(line, contentW - 14);
      doc.text(wrapped, mL + 7, y + 13 + i * lineHMat, { lineHeightFactor: 1.4 });
    });

    y += boxH + 9;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CONDIÇÕES DE PAGAMENTO
  // ───────────────────────────────────────────────────────────────────────────
  const hasDynamicConditions = data.paymentConditions && data.paymentConditions.length > 0;
  if (hasDynamicConditions && cfg.sections.showPaymentConditions) {
    // Header label above the conditions block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(doc, "#64748B");
    doc.text("CONDIÇÕES DE PAGAMENTO", mL, y);
    y += 4;

    data.paymentConditions!.forEach((cond, idx) => {
      autoTable(doc, {
        startY: y,
        margin: { left: mL, right: mL },
        head: [[cond.name.toUpperCase()]],
        body: [[cond.fullText]],
        headStyles: {
          fillColor: hex2rgb(AZUL),
          textColor: hex2rgb(BRANCO),
          fontStyle: "bold",
          fontSize: 7.5,
          cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
        },
        bodyStyles: {
          fontSize: 8,
          textColor: hex2rgb(CINZA_TEXTO),
          cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
          overflow: "linebreak" as const,
          lineHeightFactor: 1.45,
        } as any,
        styles: {
          lineColor: hex2rgb(CINZA_BORDA),
          lineWidth: 0.2,
          overflow: "linebreak",
        },
        alternateRowStyles: { fillColor: hex2rgb(CINZA_LIGHT) },
      });
      y = (doc as any).lastAutoTable.finalY + (idx < data.paymentConditions!.length - 1 ? 3 : 0);
    });
    y += 9;
  } else {
    // Fallback: default hardcoded conditions
    const pagLines = [
      "À Vista: 5% de desconto (via PIX ou Transferência Bancária).",
      "Cartão de Crédito: Em até 3x sem juros. Parcelamentos acima de 3x incidem juros da operadora.",
    ];
    const lineHeightPag = 7.5;
    const pagH = 10 + pagLines.length * lineHeightPag;
    setFill(doc, CINZA_LIGHT);
    setDraw(doc, CINZA_BORDA);
    doc.setLineWidth(0.25);
    doc.roundedRect(mL, y, contentW, pagH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(doc, "#64748B");
    doc.text("CONDIÇÕES DE PAGAMENTO", mL + 5, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTxt(doc, CINZA_TEXTO);
    pagLines.forEach((line, i) => { doc.text(line, mL + 5, y + 13 + i * lineHeightPag); });
    y += pagH + 9;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // OBSERVAÇÕES PERSONALIZADAS (conditional)
  // ───────────────────────────────────────────────────────────────────────────
  if (data.observacoes && data.observacoes.trim() && cfg.sections.showObservacoes) {
    const obsLines = doc.splitTextToSize(data.observacoes, contentW - 14);
    const lineHObs = 5.5;
    const obsH = 10 + obsLines.length * lineHObs;
    setFill(doc, "#FFF7ED");
    setDraw(doc, "#FED7AA");
    doc.setLineWidth(0.25);
    doc.roundedRect(mL, y, contentW, obsH, 2, 2, "FD");
    setFill(doc, LARANJA);
    doc.roundedRect(mL, y, 3, obsH, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(doc, "#92400E");
    doc.text("OBSERVAÇÕES DO ORÇAMENTO", mL + 7, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTxt(doc, "#78350F");
    doc.text(obsLines, mL + 7, y + 13, { lineHeightFactor: 1.5 });
    y += obsH + 9;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // OBSERVAÇÕES PADRÃO (cláusulas contratuais) — conditional
  // ───────────────────────────────────────────────────────────────────────────
  if (cfg.sections.showObservacoesPadrao) {
    const lineHClause = 5.2;
    const clauseGap   = 4;
    const estimatedObsH = OBSERVACOES_PADRAO.reduce((acc, clause) => {
      const lines = doc.splitTextToSize(clause, contentW - 14);
      return acc + lines.length * lineHClause + clauseGap;
    }, 18);

    if (y + estimatedObsH > pageH - 32) { doc.addPage(); y = 18; }

    const obsStartY = y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setTxt(doc, AZUL);
    doc.text("OBSERVAÇÕES", mL + 2, y + 8);
    y += 14;

    OBSERVACOES_PADRAO.forEach((clause, idx) => {
      const lines = doc.splitTextToSize(`${idx + 1} - ${clause}`, contentW - 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setTxt(doc, CINZA_TEXTO);
      doc.text(lines, mL + 4, y, { lineHeightFactor: 1.5 });
      y += lines.length * lineHClause + clauseGap;
    });
    y += 4;

    setDraw(doc, CINZA_BORDA);
    doc.setLineWidth(0.25);
    doc.roundedRect(mL, obsStartY, contentW, y - obsStartY, 2, 2, "D");
    y += 8;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RODAPÉ
  // ───────────────────────────────────────────────────────────────────────────
  const footerH = 20;
  const footerY = pageH - footerH;
  setFill(doc, AZUL);
  doc.rect(0, footerY, pageW, footerH, "F");
  setFill(doc, LARANJA);
  doc.rect(0, pageH - 2.5, pageW, 2.5, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  setTxt(doc, "#94A3B8");
  doc.text("Orçamento sujeito à aprovação. Valores podem variar conforme as condições do local de obra.", pageW / 2, footerY + 7, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const fLogoX = pageW / 2 - doc.getTextWidth("IMPPEL  •  (15) 99116-5611  •  vendas@imppel.com.br") / 2 + 2;
  setTxt(doc, BRANCO);
  doc.text("IMPP", fLogoX, footerY + 15);
  const fw = doc.getTextWidth("IMPP");
  setTxt(doc, LARANJA);
  doc.text("EL", fLogoX + fw, footerY + 15);
  doc.setFont("helvetica", "normal");
  setTxt(doc, "#94A3B8");
  doc.text("  •  (15) 99116-5611  •  vendas@imppel.com.br", fLogoX + fw + doc.getTextWidth("EL"), footerY + 15);

  // ───────────────────────────────────────────────────────────────────────────
  // SALVAR
  // ───────────────────────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    (doc as any).setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setTxt(doc, "#94A3B8");
    doc.text(`Pagina ${page} de ${pageCount}`, pageW - mL, pageH - 5, { align: "right" });
  }

  const nomeCliente = data.cliente.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
  doc.save(`IMPPEL_Orcamento_${data.id ? String(data.id).padStart(4, "0") + "_" : ""}${nomeCliente}_${dataFormatada.replace(/\//g, "-")}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW REAL — gera PDF com dados fictícios e retorna Blob URL para abrir no browser
// ─────────────────────────────────────────────────────────────────────────────
export function gerarOrcamentoPDFPreview(
  templateConfig?: QuoteTemplateConfig,
  materialDisplayMode?: MaterialDisplayMode,
  showMaterialsToClient?: boolean,
): string {
  const mockData: OrcamentoPDFData = {
    id: 42,
    orcamentoNumero: 42,
    cliente: "João da Silva (Exemplo)",
    clientes: [
      {
        nome: "João da Silva",
        cargo: "Proprietário",
        telefone: "(15) 99000-1111",
        endereco: "Rua das Flores, 100 - Centro",
        cidade: "Sorocaba/SP - CEP 18020-100",
      },
      {
        nome: "Maria Oliveira",
        cargo: "Responsável Financeiro",
        telefone: "(15) 99222-3333",
        endereco: "Av. Brasil, 500 - Jardim Europa",
        cidade: "Sorocaba/SP - CEP 18030-200",
      },
    ],
    responsaveis: [
      { nome: "Carlos Pereira", cargo: "Encarregado", telefone: "(15) 99111-2222" },
    ],
    servico: "IMPERMEABILIZAÇÃO DE LAJE",
    areaM2: 250,
    serviceItems: [
      {
        lugar: "LAJE TERRAÇO",
        name: "IMPERMEABILIZAÇÃO DE LAJE",
        description: "Produto Manta Asfáltica Aluminizada 4mm — Alto desempenho",
        area: 120,
        unitPrice: 42,
        total: 5040,
      },
      {
        lugar: "BANHEIRO SUITE",
        name: "IMPERMEABILIZAÇÃO DE BANHEIRO",
        description: "Produto Vedacit Weber — Aplicação em 3 demãos",
        area: 18.5,
        unitPrice: 65,
        total: 1202.5,
      },
      {
        lugar: "FACHADA",
        name: "CALAFETAÇÃO DE RACHADURAS",
        description: "Polyurex Bicomponente — Selagem estrutural profunda",
        area: 8,
        unitPrice: 38,
        total: 304,
      },
    ],
    materialCost: 2800,
    laborCost: 2500,
    transportCost: 250,
    directCost: 5550,
    finalPrice: 6546.5,
    margin: 15.3,
    observacoes: "Área deve ser limpa e seca antes do início dos serviços. Acesso necessário ao telhado durante 3 dias úteis.",
    dataOrcamento: new Date().toLocaleDateString("pt-BR"),
    regiaoLocalizacao: "Sorocaba / SP",
    paymentConditions: [
      {
        name: "À Vista",
        fullText: "5% de desconto no pagamento à vista via PIX ou Transferência Bancária. Chave PIX: CNPJ 12.345.678/0001-90.",
      },
      {
        name: "Cartão de Crédito",
        fullText: "Parcelamento em até 3x sem juros. Parcelamentos acima de 3x incidem juros da operadora de cartão.",
      },
    ],
  };

  // Gera o PDF internamente mas em vez de salvar, retorna como blob URL
  const cfg = templateConfig ?? DEFAULT_PDF_CONFIG;
  const displayModeP: MaterialDisplayMode = materialDisplayMode ?? "material_mdo";
  const showPricesP = showMaterialsToClient !== false;
  const hidePrice = displayModeP === "mdo_lista" || !showPricesP;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW   = doc.internal.pageSize.getWidth();
  const pageH   = doc.internal.pageSize.getHeight();
  const mL      = cfg.margins.left;
  const mR      = pageW - mL;
  const contentW = pageW - mL * 2;
  const AZUL_   = cfg.headerColor;
  const LARANJA_= cfg.totalsColor;
  let y = 0;

  // ── Cabeçalho ─────────────────────────────────────────────────────────────
  const headerH = 48;
  setFill(doc, AZUL_);
  doc.rect(0, 0, pageW, headerH, "F");
  setFill(doc, LARANJA_);
  doc.rect(0, 0, pageW, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  setTxt(doc, BRANCO);
  doc.text("IMPP", mL, 28);
  const imppW2 = doc.getTextWidth("IMPP");
  setTxt(doc, LARANJA_);
  doc.text("EL", mL + imppW2, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTxt(doc, "#93C5FD");
  doc.text("Impermeabilização Profissional", mL, 36);
  const contactLines2 = ["TEL.: (015) 3302-2397   |   WHATS: (015) 99116-5611", "E-MAIL: vendas@imppel.com.br", "Av. Dr. Ulisses Guimarães, 1296 - Sorocaba / SP"];
  doc.setFontSize(8);
  setTxt(doc, "#CBD5E1");
  let cy2 = 22;
  contactLines2.forEach(line => { doc.text(line, mR, cy2, { align: "right" }); cy2 += 7; });

  // ── Faixa data ─────────────────────────────────────────────────────────────
  y = headerH;
  setFill(doc, CINZA_HEADER);
  setDraw(doc, CINZA_BORDA);
  doc.setLineWidth(0.3);
  doc.rect(0, y, pageW, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setTxt(doc, AZUL_);
  doc.text("Orçamento Nº: 0042  —  PREVIEW / EXEMPLO", mL, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(cfg.fontSize.date);
  setTxt(doc, AZUL_);
  doc.text(new Date().toLocaleDateString("pt-BR"), mR, y + 7, { align: "right" });
  y += 10;

  // ── Clientes ───────────────────────────────────────────────────────────────
  const CC2 = cfg.clientColumns ?? { nome: 68, cargo: 32, telefone: 28 };
  const enderecoW2 = Math.max(20, contentW - CC2.nome - CC2.cargo - CC2.telefone);
  const sp2Top = (cfg.sectionPadding?.top ?? 2);
  const sp2Bot = (cfg.sectionPadding?.bottom ?? 2);
  autoTable(doc, {
    startY: y,
    margin: { left: mL, right: mL },
    head: [["NOME / PARTE ENVOLVIDA", "CARGO / PAPEL", "TELEFONE", "ENDEREÇO / CIDADE"]],
    body: mockData.clientes!.map(c => [c.nome, c.cargo, c.telefone || "—", [c.endereco, c.cidade].filter(Boolean).join(", ")]),
    headStyles: { fillColor: hex2rgb(AZUL_), textColor: hex2rgb(BRANCO), fontStyle: "bold", fontSize: cfg.fontSize.header, cellPadding: { top: sp2Top, bottom: sp2Bot, left: 4, right: 4 } },
    bodyStyles: { fontSize: cfg.fontSize.body, textColor: hex2rgb(CINZA_TEXTO), cellPadding: { top: sp2Top, bottom: sp2Bot, left: 4, right: 4 }, overflow: "linebreak" as const },
    alternateRowStyles: { fillColor: hex2rgb(CINZA_LIGHT) },
    styles: { lineColor: hex2rgb(CINZA_BORDA), lineWidth: 0.2, overflow: "linebreak" },
    columnStyles: { 0: { cellWidth: CC2.nome }, 1: { cellWidth: CC2.cargo }, 2: { cellWidth: CC2.telefone }, 3: { cellWidth: enderecoW2 } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // ── Responsáveis ──────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: mL, right: mL },
    head: [["RESPONSÁVEL / EQUIPE TÉCNICA", "CARGO / FUNÇÃO", "TELEFONE"]],
    body: mockData.responsaveis!.map(r => [r.nome, r.cargo, r.telefone || "—"]),
    headStyles: { fillColor: hex2rgb(AZUL_), textColor: hex2rgb(BRANCO), fontStyle: "bold", fontSize: cfg.fontSize.header, cellPadding: { top: sp2Top, bottom: sp2Bot, left: 4, right: 4 } },
    bodyStyles: { fontSize: cfg.fontSize.body, textColor: hex2rgb(CINZA_TEXTO), cellPadding: { top: sp2Top, bottom: sp2Bot, left: 4, right: 4 } },
    alternateRowStyles: { fillColor: hex2rgb(CINZA_LIGHT) },
    styles: { lineColor: hex2rgb(CINZA_BORDA), lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: contentW - 88 }, 1: { cellWidth: 58 }, 2: { cellWidth: 30 } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Tabela de Serviços ─────────────────────────────────────────────────────
  const COL2 = cfg.columns;
  const descWidthExpandedP = contentW - COL2.item - COL2.unid - COL2.qtde;
  const descWP = hidePrice ? descWidthExpandedP : COL2.desc;

  const previewRows = mockData.serviceItems!.map((item, idx) => {
    const bg: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    const nameUpper = item.name.toUpperCase();
    const combined = item.description?.trim() ? `${nameUpper} — ${item.description}` : nameUpper;
    const lugar = item.lugar?.trim() ? item.lugar.toUpperCase() + " — " : "";
    const baseRow: any[] = [
      { content: String(idx + 1), styles: { fillColor: bg, fontStyle: "bold" as const, halign: "center" as const, valign: "middle" as const } },
      { content: lugar + combined, styles: { fillColor: bg, halign: "left" as const, valign: "top" as const, overflow: "linebreak" as const, fontSize: 7.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 3 } } },
      { content: "M²", styles: { fillColor: bg, halign: "center" as const, valign: "middle" as const } },
      { content: item.area.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), styles: { fillColor: bg, halign: "center" as const, valign: "middle" as const } },
    ];
    if (!hidePrice) {
      baseRow.push(
        { content: item.unitPrice > 0 ? fmtBRL(item.unitPrice) : "—", styles: { fillColor: bg, halign: "right" as const, valign: "middle" as const } },
        { content: fmtBRL(item.total), styles: { fillColor: bg, halign: "right" as const, valign: "middle" as const, fontStyle: "bold" as const } },
      );
    }
    return baseRow;
  });

  const previewHead = hidePrice
    ? [["ITEM", "DESCRIÇÃO DE SERVIÇOS", "UNID.", "QUANTIDADE"]]
    : [["ITEM", "DESCRIÇÃO DE SERVIÇOS", "UNID.", "QUANTIDADE", "UNITÁRIO", "TOTAL"]];

  const previewColStyles: Record<number, any> = {
    0: { halign: "center", cellWidth: COL2.item },
    1: { halign: "left",   cellWidth: descWP },
    2: { halign: "center", cellWidth: COL2.unid },
    3: { halign: "center", cellWidth: COL2.qtde },
  };
  if (!hidePrice) {
    previewColStyles[4] = { halign: "right", cellWidth: COL2.unit };
    previewColStyles[5] = { halign: "right", cellWidth: COL2.total };
  }

  autoTable(doc, {
    startY: y,
    margin: { left: mL, right: mL },
    head: previewHead,
    body: previewRows,
    headStyles: { fillColor: hex2rgb(AZUL_), textColor: hex2rgb(BRANCO), fontStyle: "bold", fontSize: cfg.fontSize.header, cellPadding: { top: cfg.rowPadding.top, bottom: cfg.rowPadding.bottom, left: 2, right: 2 }, halign: "center", overflow: "linebreak" },
    bodyStyles: { fontSize: cfg.fontSize.body, textColor: hex2rgb(CINZA_TEXTO), cellPadding: { top: cfg.rowPadding.top, bottom: cfg.rowPadding.bottom, left: 3, right: 3 }, overflow: "linebreak", lineHeightFactor: 1.45 } as any,
    styles: { lineColor: hex2rgb(CINZA_BORDA), lineWidth: 0.25, overflow: "linebreak" },
    columnStyles: previewColStyles,
  });

  // ── Total bar ──────────────────────────────────────────────────────────────
  const tableEndY2 = (doc as any).lastAutoTable.finalY;
  const totalBarH2 = 11;
  const totalLabelW2 = hidePrice ? contentW - 35 : COL2.item + descWP + COL2.unid + COL2.qtde + COL2.unit;
  const totalPriceW2 = hidePrice ? 35 : COL2.total;
  const totalFinalP = 6546.5;
  const dcP = mockData.materialCost + mockData.laborCost + mockData.transportCost;
  const materialClientP = dcP > 0 ? Math.round((totalFinalP * mockData.materialCost / dcP) * 100) / 100 : 0;
  const laborClientP = Math.round((totalFinalP - materialClientP) * 100) / 100;

  const drawTotalBarP = (startY: number, labelText: string, valueText: string, labelColor: string, valueColor: string) => {
    setFill(doc, labelColor);
    setDraw(doc, CINZA_BORDA);
    doc.setLineWidth(0.25);
    doc.rect(mL, startY, totalLabelW2, totalBarH2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(cfg.fontSize.totals);
    setTxt(doc, BRANCO);
    doc.text(labelText, mL + totalLabelW2 - 4, startY + totalBarH2 / 2 + 1.5, { align: "right" });
    setFill(doc, valueColor);
    doc.rect(mL + totalLabelW2, startY, totalPriceW2, totalBarH2, "F");
    doc.setFontSize(cfg.fontSize.totals);
    setTxt(doc, BRANCO);
    doc.text(valueText, mL + totalLabelW2 + totalPriceW2 - 2, startY + totalBarH2 / 2 + 1.5, { align: "right" });
    setDraw(doc, CINZA_BORDA);
    doc.setLineWidth(0.25);
    doc.rect(mL, startY, contentW, totalBarH2, "S");
  };

  if (showPricesP && displayModeP === "material_separado" && materialClientP > 0) {
    const CINZA_AZULADO = "#475569";
    drawTotalBarP(tableEndY2,                "MATERIAIS",   fmtBRL(materialClientP), CINZA_AZULADO, "#334155");
    drawTotalBarP(tableEndY2 + totalBarH2,   "MÃO DE OBRA", fmtBRL(laborClientP),   CINZA_AZULADO, "#334155");
    drawTotalBarP(tableEndY2 + totalBarH2*2, "TOTAL GERAL", fmtBRL(totalFinalP),     AZUL_,         LARANJA_);
    y = tableEndY2 + totalBarH2 * 3 + 10;
  } else {
    const label = displayModeP === "mdo_lista" && showPricesP ? "MÃO DE OBRA / VALOR DO SERVIÇO" : "TOTAL GERAL";
    drawTotalBarP(tableEndY2, label, fmtBRL(totalFinalP), AZUL_, LARANJA_);
    y = tableEndY2 + totalBarH2 + 10;
  }

  // ── Seção "MATERIAIS NECESSÁRIOS" — apenas no Modo 2 (mdo_lista) com showPrices=true ──
  if (displayModeP === "mdo_lista" && showPricesP && mockData.serviceItems!.length > 0) {
    const AZUL_CLARO_FILL = "#EFF6FF";
    const AZUL_CLARO_BORDA = "#BFDBFE";
    const AZUL_TEXTO = "#1E40AF";
    const AZUL_ITEM  = "#1D4ED8";

    const matLines: string[] = [];
    mockData.serviceItems!.forEach((item, idx) => {
      const lugar = item.lugar?.trim() ? item.lugar.trim().toUpperCase() + " — " : "";
      const name = item.name.toUpperCase();
      const desc = item.description?.trim() ? `: ${item.description.trim()}` : "";
      const area = item.area > 0 ? ` (${item.area.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} m²)` : "";
      matLines.push(`${idx + 1}. ${lugar}${name}${desc}${area}`);
    });

    const lineHMat = 5.5;
    const boxH = 12 + matLines.length * lineHMat + 4;

    if (y + boxH > pageH - 32) { doc.addPage(); y = 18; }

    setFill(doc, AZUL_CLARO_FILL);
    setDraw(doc, AZUL_CLARO_BORDA);
    doc.setLineWidth(0.3);
    doc.roundedRect(mL, y, contentW, boxH, 2, 2, "FD");
    setFill(doc, AZUL_ITEM);
    doc.roundedRect(mL, y, 3, boxH, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(doc, AZUL_TEXTO);
    doc.text("MATERIAIS NECESSÁRIOS", mL + 7, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setTxt(doc, AZUL_TEXTO);
    matLines.forEach((line, i) => {
      doc.text(line, mL + 7, y + 13 + i * lineHMat, { lineHeightFactor: 1.5 });
    });
    y += boxH + 9;
  }

  // ── Condições de pagamento ─────────────────────────────────────────────────
  if (cfg.sections.showPaymentConditions) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(doc, "#64748B");
    doc.text("CONDIÇÕES DE PAGAMENTO", mL, y);
    y += 4;
    mockData.paymentConditions!.forEach((cond, idx) => {
      autoTable(doc, {
        startY: y,
        margin: { left: mL, right: mL },
        head: [[cond.name.toUpperCase()]],
        body: [[cond.fullText]],
        headStyles: { fillColor: hex2rgb(AZUL_), textColor: hex2rgb(BRANCO), fontStyle: "bold", fontSize: 7.5, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 } },
        bodyStyles: { fontSize: 8, textColor: hex2rgb(CINZA_TEXTO), cellPadding: { top: 4, bottom: 4, left: 5, right: 5 }, overflow: "linebreak" as const, lineHeightFactor: 1.45 } as any,
        styles: { lineColor: hex2rgb(CINZA_BORDA), lineWidth: 0.2, overflow: "linebreak" },
        alternateRowStyles: { fillColor: hex2rgb(CINZA_LIGHT) },
      });
      y = (doc as any).lastAutoTable.finalY + (idx < mockData.paymentConditions!.length - 1 ? 3 : 0);
    });
    y += 9;
  }

  // ── Observações ───────────────────────────────────────────────────────────
  if (mockData.observacoes && cfg.sections.showObservacoes) {
    const obsLines2 = doc.splitTextToSize(mockData.observacoes, contentW - 14);
    const lineHObs2 = 5.5;
    const obsH2 = 10 + obsLines2.length * lineHObs2;
    setFill(doc, "#FFF7ED");
    setDraw(doc, "#FED7AA");
    doc.setLineWidth(0.25);
    doc.roundedRect(mL, y, contentW, obsH2, 2, 2, "FD");
    setFill(doc, LARANJA_);
    doc.roundedRect(mL, y, 3, obsH2, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(doc, "#92400E");
    doc.text("OBSERVAÇÕES DO ORÇAMENTO", mL + 7, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setTxt(doc, "#78350F");
    doc.text(obsLines2, mL + 7, y + 13, { lineHeightFactor: 1.5 });
    y += obsH2 + 9;
  }

  // ── Cláusulas padrão ──────────────────────────────────────────────────────
  if (cfg.sections.showObservacoesPadrao) {
    const lineHClause2 = 5.2;
    const clauseGap2 = 4;
    const estH2 = OBSERVACOES_PADRAO.reduce((acc, cl) => {
      const lines = doc.splitTextToSize(cl, contentW - 14);
      return acc + lines.length * lineHClause2 + clauseGap2;
    }, 18);
    if (y + estH2 > pageH - 32) { doc.addPage(); y = 18; }
    const obsStartY2 = y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setTxt(doc, AZUL_);
    doc.text("OBSERVAÇÕES", mL + 2, y + 8);
    y += 14;
    OBSERVACOES_PADRAO.forEach((clause, idx) => {
      const lines = doc.splitTextToSize(`${idx + 1} - ${clause}`, contentW - 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setTxt(doc, CINZA_TEXTO);
      doc.text(lines, mL + 4, y, { lineHeightFactor: 1.5 });
      y += lines.length * lineHClause2 + clauseGap2;
    });
    y += 4;
    setDraw(doc, CINZA_BORDA);
    doc.setLineWidth(0.25);
    doc.roundedRect(mL, obsStartY2, contentW, y - obsStartY2, 2, 2, "D");
    y += 8;
  }

  // ── Rodapé ────────────────────────────────────────────────────────────────
  const footerH2 = 20;
  const footerY2 = pageH - footerH2;
  setFill(doc, AZUL_);
  doc.rect(0, footerY2, pageW, footerH2, "F");
  setFill(doc, LARANJA_);
  doc.rect(0, pageH - 2.5, pageW, 2.5, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  setTxt(doc, "#94A3B8");
  doc.text("Orçamento sujeito à aprovação. Valores podem variar conforme as condições do local de obra.", pageW / 2, footerY2 + 7, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const fLogoX2 = pageW / 2 - doc.getTextWidth("IMPPEL  •  (15) 99116-5611  •  vendas@imppel.com.br") / 2 + 2;
  setTxt(doc, BRANCO);
  doc.text("IMPP", fLogoX2, footerY2 + 15);
  const fw2 = doc.getTextWidth("IMPP");
  setTxt(doc, LARANJA_);
  doc.text("EL", fLogoX2 + fw2, footerY2 + 15);
  doc.setFont("helvetica", "normal");
  setTxt(doc, "#94A3B8");
  doc.text("  •  (15) 99116-5611  •  vendas@imppel.com.br", fLogoX2 + fw2 + doc.getTextWidth("EL"), footerY2 + 15);

  return doc.output("bloburl") as unknown as string;
}
