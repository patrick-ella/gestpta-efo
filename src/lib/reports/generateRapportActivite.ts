import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import logoSrc from "@/assets/logo-efo.png";
import { getExtrantProgression, getProgressionColorRgb, type CritereForProgression } from "@/lib/extrantProgression";

// ── Types ───────────────────────────────────────────────────
export type ReportPeriod = {
  type: "mensuel" | "trimestriel" | "annuel";
  exercice: number;
  mois?: number;
  trimestre?: 1 | 2 | 3 | 4;
  activiteId?: string;
};

// ── Formatting helpers ──────────────────────────────────────
function formatFCFA(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "0 FCFA";
  const value = Math.round(Number(amount));
  if (value === 0) return "0 FCFA";
  const abs = Math.abs(value);
  const str = abs.toString();
  const parts: string[] = [];
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i));
  }
  return (value < 0 ? "-" : "") + parts.join("\u0020") + " FCFA";
}

function formatTaux(taux: number): string {
  const rounded = Math.round(taux * 10) / 10;
  const intPart = Math.floor(rounded);
  const decPart = Math.round((rounded - intPart) * 10);
  return intPart.toString() + "," + decPart.toString() + " %";
}

function statutLabel(s: string): string {
  const map: Record<string, string> = {
    non_produit: "Non produit",
    en_cours: "En cours",
    produit: "Produit",
    valide: "Validé",
    rejete: "Rejeté",
  };
  return map[s] || s;
}

function formatDateFr(d: string | null): string {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}

// ── Period helpers ──────────────────────────────────────────
const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function getPeriodeLabel(period: ReportPeriod): string {
  switch (period.type) {
    case "mensuel":
      return `${MOIS_NOMS[(period.mois ?? 1) - 1]} ${period.exercice}`;
    case "trimestriel": {
      const t = period.trimestre ?? 1;
      const suffix = t === 1 ? "er" : "ème";
      return `${t}${suffix} Trimestre ${period.exercice}`;
    }
    case "annuel":
      return `Exercice ${period.exercice}`;
  }
}

function getReportTitle(period: ReportPeriod): string {
  switch (period.type) {
    case "mensuel":
      return "RAPPORT MENSUEL D'ACTIVITÉ DE L'EFO";
    case "trimestriel":
      return "RAPPORT TRIMESTRIEL D'ACTIVITÉ DE L'EFO";
    case "annuel":
      return "RAPPORT D'ACTIVITÉ DE L'EFO";
  }
}

function getReportTitleShort(period: ReportPeriod): string {
  switch (period.type) {
    case "mensuel":
      return "Rapport mensuel d'activité de l'EFO";
    case "trimestriel":
      return "Rapport trimestriel d'activité de l'EFO";
    case "annuel":
      return "Rapport d'activité de l'EFO";
  }
}

function getFilename(period: ReportPeriod): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  switch (period.type) {
    case "mensuel":
      return `Rapport_Mensuel_EFO_${period.exercice}_M${pad(period.mois ?? 1)}_${ts}.pdf`;
    case "trimestriel":
      return `Rapport_Trimestriel_EFO_${period.exercice}_T${period.trimestre}_${ts}.pdf`;
    case "annuel":
      return `Rapport_Activite_EFO_${period.exercice}_${ts}.pdf`;
  }
}

// ── Logo loader ─────────────────────────────────────────────
let cachedLogo: string | null = null;
async function loadLogo(): Promise<string | null> {
  if (cachedLogo) return cachedLogo;
  try {
    const res = await fetch(logoSrc);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => { cachedLogo = reader.result as string; resolve(cachedLogo); };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ── Page drawing helpers ────────────────────────────────────
const PAGE_W = 297;
const MARGIN_L = 12;
const MARGIN_R = 12;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const MAX_Y = 175;

function drawPageHeader(doc: jsPDF, logo: string | null, pageTitle: string, period: ReportPeriod) {
  doc.setFillColor(31, 78, 121);
  doc.rect(0, 0, PAGE_W, 12, "F");
  if (logo) doc.addImage(logo, "PNG", 3, 2, 0, 8);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(getReportTitleShort(period), 14, 6);
  doc.setTextColor(174, 214, 241);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(pageTitle, 14, 10);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(`Exercice ${period.exercice}`, PAGE_W - MARGIN_R, 7, { align: "right" });
}

function drawPageFooter(doc: jsPDF, logo: string | null, pageNum: number, totalPages: number) {
  doc.setDrawColor(174, 214, 241);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, 195, PAGE_W - MARGIN_R, 195);
  if (logo) doc.addImage(logo, "PNG", MARGIN_L, 197, 0, 6);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 78, 121);
  doc.text("GestPTA-EFO", 22, 201);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text("Montants en FCFA", PAGE_W / 2, 201, { align: "center" });
  doc.text(`Page ${pageNum} / ${totalPages}`, PAGE_W - MARGIN_R, 201, { align: "right" });
}

function drawCoverPage(doc: jsPDF, logo: string | null, period: ReportPeriod, scope: string) {
  doc.setFillColor(31, 78, 121);
  doc.rect(0, 0, PAGE_W, 30, "F");
  if (logo) doc.addImage(logo, "PNG", 14, 5, 0, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CAMEROON CIVIL AVIATION AUTHORITY", 50, 14);
  doc.setTextColor(174, 214, 241);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("ÉCOLE DE FORMATION DE LA CCAA (EFO)", 50, 22);

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 78, 121);
  doc.text(getReportTitle(period), PAGE_W / 2, 55, { align: "center" });
  doc.setFontSize(16);
  doc.setTextColor(46, 117, 182);
  doc.text("Exécution budgétaire et suivi des extrants (GAR) — Action 302", PAGE_W / 2, 67, { align: "center" });

  doc.setDrawColor(46, 117, 182);
  doc.setLineWidth(0.8);
  doc.line(50, 75, 247, 75);

  doc.setDrawColor(46, 117, 182);
  doc.setLineWidth(0.3);
  doc.setFillColor(235, 243, 251);
  doc.roundedRect(60, 83, 177, 50, 3, 3, "FD");

  const periodeLabel = getPeriodeLabel(period);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 78, 121);
  doc.text(`Période : ${periodeLabel}`, PAGE_W / 2, 96, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  doc.text(`Exercice budgétaire : ${period.exercice}`, PAGE_W / 2, 105, { align: "center" });
  doc.text(`Périmètre : ${scope}`, PAGE_W / 2, 114, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  const now = new Date();
  doc.text(
    `Généré le ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    PAGE_W / 2, 123, { align: "center" }
  );

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(107, 114, 128);
  doc.text("Montants exprimés en FCFA", PAGE_W / 2, 148, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(156, 163, 175);
  doc.text("Document confidentiel — EFO / CCAA", PAGE_W / 2, 155, { align: "center" });
}

function drawActiviteHeader(doc: jsPDF, y: number, code: string, libelle: string, plafond: number): number {
  doc.setFillColor(31, 78, 121);
  doc.roundedRect(MARGIN_L, y, CONTENT_W, 10, 1, 1, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`ACTIVITÉ [${code}]  —  ${libelle}`, MARGIN_L + 4, y + 6.5);
  doc.setFontSize(8);
  doc.setTextColor(174, 214, 241);
  doc.text(`Budget plafond : ${formatFCFA(plafond)}`, PAGE_W - MARGIN_R - 4, y + 6.5, { align: "right" });
  return y + 14;
}

function drawTacheHeader(doc: jsPDF, y: number, code: string, libelle: string, plafond: number): number {
  doc.setFillColor(46, 117, 182);
  doc.roundedRect(MARGIN_L, y, CONTENT_W, 8, 1, 1, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`Tâche [${code}]  —  ${libelle}`, MARGIN_L + 4, y + 5);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Plafond : ${formatFCFA(plafond)}`, PAGE_W - MARGIN_R - 4, y + 5, { align: "right" });
  return y + 10;
}

function drawActiviteTotalBar(doc: jsPDF, y: number, code: string, prevu: number, engage: number, execute: number): number {
  const tauxEng = prevu > 0 ? (engage / prevu) * 100 : 0;
  const tauxReal = prevu > 0 ? (execute / prevu) * 100 : 0;
  doc.setFillColor(31, 78, 121);
  doc.roundedRect(MARGIN_L, y, CONTENT_W, 9, 1, 1, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`TOTAL ACTIVITÉ ${code}`, MARGIN_L + 4, y + 6);
  doc.setFontSize(8);
  doc.text(
    `Prévu : ${formatFCFA(prevu)}  |  Engagé : ${formatFCFA(engage)} (${formatTaux(tauxEng)})  |  Réalisé : ${formatFCFA(execute)} (${formatTaux(tauxReal)})`,
    PAGE_W - MARGIN_R - 4, y + 6, { align: "right" }
  );
  return y + 13;
}

// ── Extrant helpers ─────────────────────────────────────────
interface ExtrantForReport {
  id: string;
  reference: string;
  libelle: string;
  indicateur_mesure: string;
  statut: string;
  date_production: string | null;
  activite_id: string;
  ordre: number | null;
  criteres: { id: string; valide_final: boolean | null }[];
  preuvesCount: number;
}

function computeExtrantSummary(extrants: ExtrantForReport[]) {
  const total = extrants.length;
  const produits = extrants.filter(e => e.statut === "produit" || e.statut === "valide").length;
  const enCours = extrants.filter(e => e.statut === "en_cours").length;
  const nonProduits = extrants.filter(e => e.statut === "non_produit").length;
  const rejetes = extrants.filter(e => e.statut === "rejete").length;
  const taux = total > 0 ? Math.round((produits / total) * 100) : 0;
  return { total, produits, enCours, nonProduits, rejetes, taux };
}

// ── Budget table for a tâche ────────────────────────────────
function drawBudgetTable(
  doc: jsPDF,
  currentY: number,
  tache: any,
  budgetRows: { code: string; libelle: string; prevu: number; engage: number; execute: number }[]
): { y: number; prevu: number; engage: number; execute: number } {
  let tachePrevu = 0;
  let tacheEngage = 0;
  let tacheExecute = 0;

  if (budgetRows.length > 0) {
    const tableBody = budgetRows.map((r) => {
      tachePrevu += r.prevu;
      tacheEngage += r.engage;
      tacheExecute += r.execute;
      const tauxEng = r.prevu > 0 ? Math.round((r.engage / r.prevu) * 1000) / 10 : 0;
      const tauxReal = r.prevu > 0 ? Math.round((r.execute / r.prevu) * 1000) / 10 : 0;
      return [r.code, r.libelle.substring(0, 50), formatFCFA(r.prevu), formatFCFA(r.engage), formatTaux(tauxEng), formatFCFA(r.execute), formatTaux(tauxReal)];
    });

    const tacheTauxEng = tachePrevu > 0 ? Math.round((tacheEngage / tachePrevu) * 1000) / 10 : 0;
    const tacheTauxReal = tachePrevu > 0 ? Math.round((tacheExecute / tachePrevu) * 1000) / 10 : 0;

    autoTable(doc, {
      startY: currentY,
      margin: { left: MARGIN_L, right: MARGIN_R },
      tableWidth: CONTENT_W,
      head: [[
        { content: "Code", styles: { halign: "center" as const } },
        { content: "Libellé de la ligne budgétaire", styles: { halign: "left" as const } },
        { content: "Prévu", styles: { halign: "right" as const } },
        { content: "Engagé", styles: { halign: "right" as const } },
        { content: "Taux eng.", styles: { halign: "center" as const } },
        { content: "Réalisé", styles: { halign: "right" as const } },
        { content: "Taux réal.", styles: { halign: "center" as const } },
      ]],
      body: tableBody,
      foot: [[
        { content: "", styles: { halign: "center" as const } },
        { content: `TOTAL TÂCHE ${tache.code}`, styles: { halign: "left" as const, fontStyle: "bold" as const } },
        { content: formatFCFA(tachePrevu), styles: { halign: "right" as const, fontStyle: "bold" as const } },
        { content: formatFCFA(tacheEngage), styles: { halign: "right" as const, fontStyle: "bold" as const } },
        { content: formatTaux(tacheTauxEng), styles: { halign: "center" as const, fontStyle: "bold" as const } },
        { content: formatFCFA(tacheExecute), styles: { halign: "right" as const, fontStyle: "bold" as const } },
        { content: formatTaux(tacheTauxReal), styles: { halign: "center" as const, fontStyle: "bold" as const } },
      ]],
      headStyles: {
        fillColor: [214, 228, 240], textColor: [31, 78, 121], fontStyle: "bold", fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }, lineWidth: 0.2, lineColor: [174, 214, 241],
      },
      bodyStyles: {
        fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
        lineWidth: 0.1, lineColor: [220, 230, 240], textColor: [30, 30, 30],
      },
      alternateRowStyles: { fillColor: [245, 249, 253] },
      footStyles: {
        fillColor: [31, 78, 121], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }, lineWidth: 0.2,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 14, cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 1 } },
        1: { halign: "left", cellWidth: 71, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 2 }, overflow: "ellipsize" },
        2: { halign: "right", cellWidth: 40, cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 3 } },
        3: { halign: "right", cellWidth: 40, cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 3 } },
        4: { halign: "center", cellWidth: 27, cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 1 } },
        5: { halign: "right", cellWidth: 40, cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 3 } },
        6: { halign: "center", cellWidth: 41, cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 1 } },
      },
      didParseCell: (data) => {
        if (data.column.index === 1 && data.section === "body") {
          const text = String(data.cell.raw);
          if (text.length > 40) data.cell.text = [text.substring(0, 37) + "..."];
        }
        if (data.column.index === 4 && data.section === "body") {
          const raw = String(data.cell.raw).replace(",", ".").replace(" %", "");
          const t = parseFloat(raw);
          if (isNaN(t) || t === 0) data.cell.styles.textColor = [156, 163, 175];
          else if (t < 50) data.cell.styles.textColor = [239, 68, 68];
          else if (t < 75) data.cell.styles.textColor = [245, 158, 11];
          else if (t < 100) data.cell.styles.textColor = [59, 130, 246];
          else { data.cell.styles.textColor = [29, 78, 216]; data.cell.styles.fontStyle = "bold"; }
        }
        if (data.column.index === 6 && data.section === "body") {
          const raw = String(data.cell.raw).replace(",", ".").replace(" %", "");
          const t = parseFloat(raw);
          if (isNaN(t) || t === 0) data.cell.styles.textColor = [156, 163, 175];
          else if (t < 50) data.cell.styles.textColor = [239, 68, 68];
          else if (t < 75) data.cell.styles.textColor = [245, 158, 11];
          else if (t < 100) data.cell.styles.textColor = [34, 197, 94];
          else { data.cell.styles.textColor = [21, 128, 61]; data.cell.styles.fontStyle = "bold"; }
        }
      },
      willDrawCell: (data) => {
        if ([2, 3, 5].includes(data.column.index)) data.cell.styles.halign = "right";
      },
      showHead: "everyPage",
      showFoot: "lastPage",
      pageBreak: "auto",
      rowPageBreak: "avoid",
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;
  } else {
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text("Aucune ligne budgétaire", MARGIN_L + 4, currentY + 4);
    currentY += 8;
  }

  return { y: currentY, prevu: tachePrevu, engage: tacheEngage, execute: tacheExecute };
}

// ── Extrants table ──────────────────────────────────────────
function drawExtrantsSection(
  doc: jsPDF,
  currentY: number,
  actCode: string,
  actExtrants: ExtrantForReport[],
  pageSections: Record<number, string>
): number {
  if (actExtrants.length === 0) return currentY;

  doc.addPage();
  pageSections[doc.getNumberOfPages()] = `Extrants (GAR) — ${actCode}`;
  currentY = 16;

  const extSummary = computeExtrantSummary(actExtrants);

  doc.setFillColor(29, 106, 59);
  doc.roundedRect(MARGIN_L, currentY, CONTENT_W, 10, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`EXTRANTS (GAR) — Activité ${actCode}`, MARGIN_L + 4, currentY + 6.5);
  doc.setFontSize(8);
  doc.text(
    `${extSummary.total} extrant(s)  |  ${extSummary.produits} produits/validés  |  ${extSummary.enCours} en cours`,
    PAGE_W - MARGIN_R - 4, currentY + 6.5, { align: "right" }
  );
  currentY += 14;

  const extBody = actExtrants.map((e) => {
    const totalC = e.criteres.length;
    const validC = e.criteres.filter(c => c.valide_final).length;
    const criteresLabel = totalC > 0 ? `${validC}/${totalC}` : "—";
    const preuvesLabel = e.preuvesCount > 0 ? String(e.preuvesCount) : "—";
    return [e.reference, e.libelle.substring(0, 55), e.indicateur_mesure.substring(0, 50), statutLabel(e.statut), formatDateFr(e.date_production), criteresLabel, preuvesLabel];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: MARGIN_L, right: MARGIN_R },
    tableWidth: CONTENT_W,
    head: [[
      { content: "Réf.", styles: { halign: "center" as const } },
      { content: "Libellé de l'extrant", styles: { halign: "left" as const } },
      { content: "Indicateur de mesure", styles: { halign: "left" as const } },
      { content: "Statut", styles: { halign: "center" as const } },
      { content: "Date prod.", styles: { halign: "center" as const } },
      { content: "Critères", styles: { halign: "center" as const } },
      { content: "Preuves", styles: { halign: "center" as const } },
    ]],
    body: extBody,
    headStyles: {
      fillColor: [29, 106, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }, lineWidth: 0.2,
    },
    bodyStyles: {
      fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      lineWidth: 0.1, lineColor: [200, 230, 210], textColor: [30, 30, 30],
    },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { halign: "center", cellWidth: 14, fontStyle: "bold" },
      1: { halign: "left", cellWidth: 78, overflow: "ellipsize" },
      2: { halign: "left", cellWidth: 70, fontSize: 7, fontStyle: "italic", textColor: [80, 80, 80], overflow: "ellipsize" },
      3: { halign: "center", cellWidth: 34 },
      4: { halign: "center", cellWidth: 27 },
      5: { halign: "center", cellWidth: 25 },
      6: { halign: "center", cellWidth: 25 },
    },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.section === "body") {
        const s = String(data.cell.raw);
        if (s === "Non produit") data.cell.styles.textColor = [239, 68, 68];
        else if (s === "En cours") data.cell.styles.textColor = [245, 158, 11];
        else if (s === "Produit") { data.cell.styles.textColor = [34, 197, 94]; data.cell.styles.fontStyle = "bold"; }
        else if (s === "Validé") { data.cell.styles.textColor = [59, 130, 246]; data.cell.styles.fontStyle = "bold"; }
        else if (s === "Rejeté") { data.cell.styles.textColor = [153, 27, 27]; data.cell.styles.fontStyle = "italic"; }
      }
      if (data.column.index === 5 && data.section === "body") {
        const val = String(data.cell.raw);
        if (val === "—") { data.cell.styles.textColor = [156, 163, 175]; }
        else {
          const ps = val.split("/").map(Number);
          if (ps.length === 2) {
            if (ps[0] === ps[1] && ps[1] > 0) { data.cell.styles.textColor = [34, 197, 94]; data.cell.styles.fontStyle = "bold"; }
            else if (ps[0] > 0) data.cell.styles.textColor = [245, 158, 11];
            else data.cell.styles.textColor = [239, 68, 68];
          }
        }
      }
      if (data.column.index === 6 && data.section === "body") {
        const val = String(data.cell.raw);
        if (val !== "—") { data.cell.styles.textColor = [59, 130, 246]; data.cell.styles.fontStyle = "bold"; }
        else data.cell.styles.textColor = [156, 163, 175];
      }
    },
    showHead: "everyPage",
    pageBreak: "auto",
    rowPageBreak: "avoid",
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  if (currentY > MAX_Y - 18) { doc.addPage(); pageSections[doc.getNumberOfPages()] = `Extrants (GAR) — ${actCode}`; currentY = 16; }

  doc.setFillColor(226, 239, 218);
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN_L, currentY, CONTENT_W, 9, 1, 1, "FD");
  doc.setTextColor(29, 106, 59);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Total extrants : ${extSummary.total}   |   Produits / Validés : ${extSummary.produits}   |   En cours : ${extSummary.enCours}   |   Non produits : ${extSummary.nonProduits}   |   Taux de production : ${extSummary.taux}%`,
    PAGE_W / 2, currentY + 5.5, { align: "center" }
  );
  currentY += 13;

  const progressWidth = CONTENT_W * (extSummary.taux / 100);
  doc.setFillColor(209, 231, 209);
  doc.roundedRect(MARGIN_L, currentY, CONTENT_W, 3, 1, 1, "F");
  if (progressWidth > 0) {
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(MARGIN_L, currentY, progressWidth, 3, 1, 1, "F");
  }
  doc.setTextColor(29, 106, 59);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`${extSummary.taux}%`, PAGE_W - MARGIN_R, currentY + 2.5, { align: "right" });

  return currentY + 8;
}

// ── Main export function ────────────────────────────────────
export async function generateRapportActivite(period: ReportPeriod) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = await loadLogo();

  // Fetch exercice
  const { data: exercices } = await supabase.from("exercices").select("*").eq("annee", period.exercice);
  const exercice = exercices?.[0];
  if (!exercice) throw new Error(`Exercice ${period.exercice} introuvable`);
  const exerciceId = exercice.id;

  // Fetch data
  const [actRes, tachRes, stRes, linesRes, extRes, critRes, preuvRes] = await Promise.all([
    supabase.from("activites").select("*").eq("exercice_id", exerciceId).order("ordre"),
    supabase.from("taches").select("*").order("ordre"),
    supabase.from("sous_taches").select("id, tache_id"),
    supabase.from("sous_tache_lignes_budgetaires").select("*").eq("exercice_id", exerciceId),
    supabase.from("extrants").select("id, reference, libelle, indicateur_mesure, statut, date_production, activite_id, ordre").order("ordre"),
    supabase.from("extrants_criteres").select("id, extrant_id, valide_final"),
    supabase.from("extrants_preuves").select("id, extrant_id"),
  ]);

  let activites = actRes.data || [];
  const taches = tachRes.data || [];
  const sousTaches = stRes.data || [];
  const allLines = linesRes.data || [];
  const allExtrants = extRes.data || [];
  const allCriteres = critRes.data || [];
  const allPreuves = preuvRes.data || [];

  if (period.activiteId) {
    activites = activites.filter((a) => a.id === period.activiteId);
  }

  // Build enriched extrants
  const extrantsMap = new Map<string, ExtrantForReport[]>();
  for (const e of allExtrants) {
    const ext: ExtrantForReport = {
      ...e,
      ordre: e.ordre ?? 0,
      criteres: allCriteres.filter(c => c.extrant_id === e.id).map(c => ({ id: c.id, valide_final: c.valide_final })),
      preuvesCount: allPreuves.filter(p => p.extrant_id === e.id).length,
    };
    const arr = extrantsMap.get(e.activite_id) ?? [];
    arr.push(ext);
    extrantsMap.set(e.activite_id, arr);
  }

  const scope = period.activiteId
    ? `Activité ${activites[0]?.code || ""}`
    : "Toutes les activités";

  const pageSections: Record<number, string> = {};

  // Cover page
  drawCoverPage(doc, logo, period, scope);

  let grandTotalPrevu = 0;
  let grandTotalExecute = 0;

  // Content pages
  for (const act of activites) {
    const actTaches = taches.filter((t) => t.activite_id === act.id);

    doc.addPage();
    pageSections[doc.getNumberOfPages()] = `Exécution budgétaire — ${act.code}`;
    let currentY = 16;

    currentY = drawActiviteHeader(doc, currentY, act.code, act.libelle, act.budget_total || 0);

    let actTotalPrevu = 0;
    let actTotalEngage = 0;
    let actTotalExecute = 0;

    for (const tache of actTaches) {
      if (currentY > MAX_Y - 35) {
        doc.addPage();
        pageSections[doc.getNumberOfPages()] = `Exécution budgétaire — ${act.code}`;
        currentY = 16;
      }

      currentY = drawTacheHeader(doc, currentY, tache.code, tache.libelle, tache.budget_total || 0);

      const tacheSts = sousTaches.filter((st) => st.tache_id === tache.id);
      const stIds = new Set(tacheSts.map((st) => st.id));
      const tacheLines = allLines.filter((l) => stIds.has(l.sous_tache_id));

      const grouped = new Map<string, { code: string; libelle: string; prevu: number; engage: number; execute: number }>();
      for (const l of tacheLines) {
        const engage = (l as any).montant_engage ?? 0;
        const existing = grouped.get(l.code_ligne);
        if (existing) {
          existing.prevu += l.montant_prevu;
          existing.engage += engage;
          existing.execute += l.montant_execute;
        } else {
          grouped.set(l.code_ligne, { code: l.code_ligne, libelle: l.libelle_ligne, prevu: l.montant_prevu, engage, execute: l.montant_execute });
        }
      }

      const budgetRows = Array.from(grouped.values()).sort((a, b) => a.code.localeCompare(b.code));
      const result = drawBudgetTable(doc, currentY, tache, budgetRows);
      currentY = result.y;
      actTotalPrevu += result.prevu;
      actTotalEngage += result.engage;
      actTotalExecute += result.execute;
    }

    if (currentY > MAX_Y - 12) { doc.addPage(); pageSections[doc.getNumberOfPages()] = `Exécution budgétaire — ${act.code}`; currentY = 16; }
    currentY = drawActiviteTotalBar(doc, currentY, act.code, actTotalPrevu, actTotalEngage, actTotalExecute);

    grandTotalPrevu += actTotalPrevu;
    grandTotalExecute += actTotalExecute;

    // Volet B
    const actExtrants = extrantsMap.get(act.id) ?? [];
    drawExtrantsSection(doc, 0, act.code, actExtrants, pageSections);
  }

  // Summary page
  doc.addPage();
  pageSections[doc.getNumberOfPages()] = "Récapitulatif général";
  let sumY = 16;

  const periodeLabel = getPeriodeLabel(period);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 78, 121);
  doc.text(`RÉCAPITULATIF GÉNÉRAL — ${periodeLabel}`, PAGE_W / 2, sumY + 9, { align: "center" });
  sumY += 18;

  // Budget summary
  const summaryBody = activites.map((act) => {
    const actTaches = taches.filter((t) => t.activite_id === act.id);
    const actStIds = new Set(sousTaches.filter((st) => actTaches.some((t) => t.id === st.tache_id)).map((st) => st.id));
    const actLines = allLines.filter((l) => actStIds.has(l.sous_tache_id));
    const prevu = actLines.reduce((s, l) => s + l.montant_prevu, 0);
    const execute = actLines.reduce((s, l) => s + l.montant_execute, 0);
    const taux = prevu > 0 ? Math.round((execute / prevu) * 1000) / 10 : 0;
    return [act.code, act.libelle.substring(0, 40), formatFCFA(act.budget_total || 0), formatFCFA(prevu), formatFCFA(execute), formatTaux(taux)];
  });

  const grandTaux = grandTotalPrevu > 0 ? Math.round((grandTotalExecute / grandTotalPrevu) * 1000) / 10 : 0;
  const grandTotalRow = ["TOTAL", "", formatFCFA(grandTotalPrevu), formatFCFA(grandTotalPrevu), formatFCFA(grandTotalExecute), formatTaux(grandTaux)];

  autoTable(doc, {
    startY: sumY,
    margin: { left: MARGIN_L, right: MARGIN_R },
    tableWidth: CONTENT_W,
    head: [["Activité", "Libellé", "Plafond", "Total prévu", "Total réalisé", "Taux %"]],
    body: [...summaryBody, grandTotalRow],
    headStyles: { fillColor: [31, 78, 121], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, cellPadding: 2, textColor: [30, 30, 30] },
    columnStyles: {
      0: { cellWidth: 40 }, 1: { cellWidth: 73 },
      2: { halign: "right", cellWidth: 45, cellPadding: { top: 2, bottom: 2, left: 1, right: 3 } },
      3: { halign: "right", cellWidth: 43, cellPadding: { top: 2, bottom: 2, left: 1, right: 3 } },
      4: { halign: "right", cellWidth: 43, cellPadding: { top: 2, bottom: 2, left: 1, right: 3 } },
      5: { halign: "center", cellWidth: 29 },
    },
    willDrawCell: (data) => { if ([2, 3, 4].includes(data.column.index)) data.cell.styles.halign = "right"; },
    didParseCell: (data) => {
      if (data.row.index === summaryBody.length && data.section === "body") {
        data.cell.styles.fillColor = [0, 0, 0];
        data.cell.styles.textColor = [255, 215, 0];
        data.cell.styles.fontStyle = "bold";
      }
    },
    showHead: "everyPage",
    rowPageBreak: "avoid",
    pageBreak: "auto",
  });

  sumY = (doc as any).lastAutoTable.finalY + 10;

  // Extrants summary
  const extSummaryBody = activites.map((act) => {
    const actExt = extrantsMap.get(act.id) ?? [];
    const s = computeExtrantSummary(actExt);
    return [`${act.code} — ${act.libelle.substring(0, 30)}`, String(s.total), String(s.produits), String(s.enCours), String(s.nonProduits), String(s.rejetes), `${s.taux}%`];
  });

  const allExtList = activites.flatMap(act => extrantsMap.get(act.id) ?? []);
  const grandExtSummary = computeExtrantSummary(allExtList);
  extSummaryBody.push(["TOTAL ACTION 302", String(grandExtSummary.total), String(grandExtSummary.produits), String(grandExtSummary.enCours), String(grandExtSummary.nonProduits), String(grandExtSummary.rejetes), `${grandExtSummary.taux}%`]);

  autoTable(doc, {
    startY: sumY,
    margin: { left: MARGIN_L, right: MARGIN_R },
    tableWidth: CONTENT_W,
    head: [["Activité", "Nb extrants", "Produits/Validés", "En cours", "Non produits", "Rejetés", "Taux prod."]],
    body: extSummaryBody,
    headStyles: { fillColor: [29, 106, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, cellPadding: 2, textColor: [30, 30, 30] },
    columnStyles: {
      0: { cellWidth: 60 }, 1: { halign: "center", cellWidth: 30 }, 2: { halign: "center", cellWidth: 40 },
      3: { halign: "center", cellWidth: 35 }, 4: { halign: "center", cellWidth: 35 }, 5: { halign: "center", cellWidth: 30 }, 6: { halign: "center", cellWidth: 43 },
    },
    didParseCell: (data) => {
      if (data.row.index === extSummaryBody.length - 1 && data.section === "body") {
        data.cell.styles.fillColor = [0, 0, 0]; data.cell.styles.textColor = [255, 215, 0]; data.cell.styles.fontStyle = "bold";
      }
      if (data.column.index === 2 && data.section === "body" && data.row.index < extSummaryBody.length - 1) { const v = parseInt(String(data.cell.raw)); if (v > 0) data.cell.styles.textColor = [34, 197, 94]; }
      if (data.column.index === 3 && data.section === "body" && data.row.index < extSummaryBody.length - 1) { const v = parseInt(String(data.cell.raw)); if (v > 0) data.cell.styles.textColor = [245, 158, 11]; }
      if (data.column.index === 4 && data.section === "body" && data.row.index < extSummaryBody.length - 1) { const v = parseInt(String(data.cell.raw)); if (v > 0) data.cell.styles.textColor = [239, 68, 68]; }
      if (data.column.index === 5 && data.section === "body" && data.row.index < extSummaryBody.length - 1) { const v = parseInt(String(data.cell.raw)); if (v > 0) data.cell.styles.textColor = [153, 27, 27]; }
    },
    showHead: "everyPage",
    rowPageBreak: "avoid",
    pageBreak: "auto",
  });

  // Apply headers/footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    const sectionTitle = pageSections[i] || getReportTitleShort(period);
    drawPageHeader(doc, logo, sectionTitle, period);
    drawPageFooter(doc, logo, i, totalPages);
  }

  doc.save(getFilename(period));
}
