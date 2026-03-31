import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import logoSrc from "@/assets/logo-efo.png";

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
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R; // 273
const MAX_Y = 175;

function drawPageHeader(doc: jsPDF, logo: string | null, pageTitle: string, annee: number) {
  doc.setFillColor(31, 78, 121);
  doc.rect(0, 0, PAGE_W, 12, "F");
  if (logo) doc.addImage(logo, "PNG", 3, 2, 0, 8);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport budgétaire et livrables", 14, 6);
  doc.setTextColor(174, 214, 241);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(pageTitle, 14, 10);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(`Exercice ${annee}`, PAGE_W - MARGIN_R, 7, { align: "right" });
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

function drawCoverPage(doc: jsPDF, logo: string | null, annee: number, scope: string) {
  // Top navy band
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
  doc.text("ÉCOLE DE FORMATION EN AÉRONAUTIQUE (EFO)", 50, 22);

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 78, 121);
  doc.text("RAPPORT BUDGÉTAIRE ET LIVRABLES", PAGE_W / 2, 55, { align: "center" });
  doc.setFontSize(16);
  doc.setTextColor(46, 117, 182);
  doc.text("PAR ACTIVITÉ / TÂCHE", PAGE_W / 2, 67, { align: "center" });

  // Decorative line
  doc.setDrawColor(46, 117, 182);
  doc.setLineWidth(0.8);
  doc.line(50, 75, 247, 75);

  // Info box
  doc.setDrawColor(46, 117, 182);
  doc.setLineWidth(0.3);
  doc.setFillColor(235, 243, 251);
  doc.roundedRect(60, 83, 177, 45, 3, 3, "FD");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 78, 121);
  doc.text(`Exercice budgétaire : ${annee}`, PAGE_W / 2, 96, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  doc.text(`Périmètre : ${scope}`, PAGE_W / 2, 105, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  const now = new Date();
  doc.text(
    `Généré le ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    PAGE_W / 2, 114, { align: "center" }
  );

  // Bottom mentions
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(107, 114, 128);
  doc.text("Montants exprimés en FCFA", PAGE_W / 2, 145, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(156, 163, 175);
  doc.text("Document confidentiel — EFO / CCAA", PAGE_W / 2, 152, { align: "center" });
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

function drawActiviteTotalBar(doc: jsPDF, y: number, code: string, prevu: number, execute: number): number {
  const taux = prevu > 0 ? (execute / prevu) * 100 : 0;
  doc.setFillColor(31, 78, 121);
  doc.roundedRect(MARGIN_L, y, CONTENT_W, 9, 1, 1, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`TOTAL ACTIVITÉ ${code}`, MARGIN_L + 4, y + 6);
  doc.setFontSize(8);
  doc.text(
    `Prévu : ${formatFCFA(prevu)}  |  Réalisé : ${formatFCFA(execute)}  |  Taux : ${formatTaux(taux)}`,
    PAGE_W - MARGIN_R - 4, y + 6, { align: "right" }
  );
  return y + 13;
}

// ── Main export function ────────────────────────────────────
export async function exportBudgetLivrablesPdf(
  annee: number,
  exerciceId: string,
  filterActiviteId?: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logo = await loadLogo();

  // Fetch data
  const [actRes, tachRes, stRes, linesRes, livRes] = await Promise.all([
    supabase.from("activites").select("*").eq("exercice_id", exerciceId).order("ordre"),
    supabase.from("taches").select("*").order("ordre"),
    supabase.from("sous_taches").select("id, tache_id"),
    supabase.from("sous_tache_lignes_budgetaires").select("*").eq("exercice_id", exerciceId),
    supabase.from("livrables").select("*"),
  ]);

  let activites = actRes.data || [];
  const taches = tachRes.data || [];
  const sousTaches = stRes.data || [];
  const allLines = linesRes.data || [];
  const allLivrables = livRes.data || [];

  if (filterActiviteId) {
    activites = activites.filter((a) => a.id === filterActiviteId);
  }

  const scope = filterActiviteId
    ? `Activité ${activites[0]?.code || ""}`
    : "Toutes les activités";

  // Track page section titles for header
  const pageSections: Record<number, string> = {};

  // ── PAGE 1: Cover ────────────────────────────────────────
  drawCoverPage(doc, logo, annee, scope);

  // Grand totals
  let grandTotalPrevu = 0;
  let grandTotalExecute = 0;
  let grandTotalLiv = 0;
  let grandTotalLivDone = 0;

  // ── Content pages ────────────────────────────────────────
  for (let ai = 0; ai < activites.length; ai++) {
    const act = activites[ai];
    const actTaches = taches.filter((t) => t.activite_id === act.id);

    // New page for each activité
    doc.addPage();
    const pageIdx = doc.getNumberOfPages();
    pageSections[pageIdx] = `Activité ${act.code} — Budget`;
    let currentY = 16;

    currentY = drawActiviteHeader(doc, currentY, act.code, act.libelle, act.budget_total || 0);

    let actTotalPrevu = 0;
    let actTotalExecute = 0;

    for (const tache of actTaches) {
      if (currentY > MAX_Y - 35) {
        doc.addPage();
        pageSections[doc.getNumberOfPages()] = `Activité ${act.code} — Tâche ${tache.code}`;
        currentY = 16;
      }

      currentY = drawTacheHeader(doc, currentY, tache.code, tache.libelle, tache.budget_total || 0);

      // Get consolidated budget lines for this tâche
      const tacheSts = sousTaches.filter((st) => st.tache_id === tache.id);
      const stIds = new Set(tacheSts.map((st) => st.id));
      const tacheLines = allLines.filter((l) => stIds.has(l.sous_tache_id));

      // Group by nomenclature code
      const grouped = new Map<string, { code: string; libelle: string; prevu: number; execute: number }>();
      for (const l of tacheLines) {
        const existing = grouped.get(l.code_ligne);
        if (existing) {
          existing.prevu += l.montant_prevu;
          existing.execute += l.montant_execute;
        } else {
          grouped.set(l.code_ligne, { code: l.code_ligne, libelle: l.libelle_ligne, prevu: l.montant_prevu, execute: l.montant_execute });
        }
      }

      const budgetRows = Array.from(grouped.values()).sort((a, b) => a.code.localeCompare(b.code));
      let tachePrevu = 0;
      let tacheExecute = 0;

      if (budgetRows.length > 0) {
        const tableBody: (string | number)[][] = budgetRows.map((r) => {
          tachePrevu += r.prevu;
          tacheExecute += r.execute;
          const taux = r.prevu > 0 ? Math.round((r.execute / r.prevu) * 1000) / 10 : 0;
          return [r.code, r.libelle.substring(0, 60), formatFCFA(r.prevu), formatFCFA(r.execute), formatFCFA(r.execute), formatTaux(taux)];
        });

        // Fix: col 3 = Engagé (same as Réalisé for now since we only track execute), col 4 = Réalisé
        // Actually the data model only has prevu/execute, so Engagé = Réalisé
        const tacheTaux = tachePrevu > 0 ? Math.round((tacheExecute / tachePrevu) * 1000) / 10 : 0;

        autoTable(doc, {
          startY: currentY,
          margin: { left: MARGIN_L, right: MARGIN_R },
          tableWidth: CONTENT_W,
          head: [["Code", "Libellé de la ligne budgétaire", "Prévu", "Engagé", "Réalisé", "Taux %"]],
          body: tableBody,
          foot: [["", `TOTAL TÂCHE ${tache.code}`, formatFCFA(tachePrevu), formatFCFA(tacheExecute), formatFCFA(tacheExecute), formatTaux(tacheTaux)]],
          headStyles: {
            fillColor: [214, 228, 240],
            textColor: [31, 78, 121],
            fontStyle: "bold",
            fontSize: 8,
            halign: "center",
            cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
            lineWidth: 0.2,
            lineColor: [174, 214, 241],
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
            lineWidth: 0.1,
            lineColor: [220, 230, 240],
            textColor: [30, 30, 30],
          },
          alternateRowStyles: { fillColor: [245, 249, 253] },
          footStyles: {
            fillColor: [31, 78, 121],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8,
            cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
            lineWidth: 0.2,
          },
          columnStyles: {
            0: { halign: "right", cellWidth: 18 },
            1: { halign: "left", cellWidth: 95 },
            2: { halign: "right", cellWidth: 45 },
            3: { halign: "right", cellWidth: 45 },
            4: { halign: "right", cellWidth: 45 },
            5: { halign: "center", cellWidth: 25 },
          },
          didParseCell: (data) => {
            if (data.column.index === 5 && data.section === "body") {
              const raw = String(data.cell.raw).replace(",", ".").replace(" %", "");
              const taux = parseFloat(raw);
              if (isNaN(taux) || taux === 0) data.cell.styles.textColor = [156, 163, 175];
              else if (taux < 50) data.cell.styles.textColor = [239, 68, 68];
              else if (taux < 75) data.cell.styles.textColor = [245, 158, 11];
              else if (taux < 100) data.cell.styles.textColor = [34, 197, 94];
              else if (taux === 100) { data.cell.styles.textColor = [21, 128, 61]; data.cell.styles.fontStyle = "bold"; }
              else { data.cell.styles.textColor = [153, 27, 27]; data.cell.styles.fontStyle = "bold"; }
            }
          },
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

      actTotalPrevu += tachePrevu;
      actTotalExecute += tacheExecute;
    }

    // Activité total bar
    if (currentY > MAX_Y - 12) { doc.addPage(); pageSections[doc.getNumberOfPages()] = `Activité ${act.code} — Total`; currentY = 16; }
    currentY = drawActiviteTotalBar(doc, currentY, act.code, actTotalPrevu, actTotalExecute);

    grandTotalPrevu += actTotalPrevu;
    grandTotalExecute += actTotalExecute;

    // ── Livrables section for this activité ──
    const actTacheIds = new Set(actTaches.map((t) => t.id));
    const actStIds = new Set(sousTaches.filter((st) => actTacheIds.has(st.tache_id)).map((st) => st.id));
    const actLivrables = allLivrables.filter(
      (l) => actTacheIds.has(l.tache_id) || (l.sous_tache_id && actStIds.has(l.sous_tache_id))
    );

    if (actLivrables.length > 0) {
      doc.addPage();
      pageSections[doc.getNumberOfPages()] = `Activité ${act.code} — Livrables`;
      currentY = 16;

      // Green header
      doc.setFillColor(29, 106, 59);
      doc.roundedRect(MARGIN_L, currentY, CONTENT_W, 8, 1, 1, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`LIVRABLES — Activité ${act.code}`, MARGIN_L + 4, currentY + 5.5);
      doc.setFontSize(8);
      doc.setTextColor(187, 247, 208);
      doc.text(`${actLivrables.length} livrables au total`, PAGE_W - MARGIN_R - 4, currentY + 5.5, { align: "right" });
      currentY += 12;

      const livBody = actLivrables.map((l) => {
        const tache = taches.find((t) => t.id === l.tache_id);
        return [
          tache?.code || "",
          l.libelle.substring(0, 55),
          statutLabel(l.statut || "non_produit"),
          l.date_production || "—",
          l.fichier_nom || "—",
        ];
      });

      const livDone = actLivrables.filter((l) => l.statut === "produit" || l.statut === "valide").length;
      const livEnCours = actLivrables.filter((l) => l.statut === "en_cours").length;
      const livNon = actLivrables.filter((l) => l.statut === "non_produit" || !l.statut).length;
      grandTotalLiv += actLivrables.length;
      grandTotalLivDone += livDone;

      autoTable(doc, {
        startY: currentY,
        margin: { left: MARGIN_L, right: MARGIN_R },
        tableWidth: CONTENT_W,
        head: [["Tâche", "Libellé du livrable", "Statut", "Date", "Fichier joint"]],
        body: livBody,
        headStyles: {
          fillColor: [29, 106, 59],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          halign: "center",
          cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
          lineWidth: 0.1,
          lineColor: [200, 230, 210],
          textColor: [30, 30, 30],
        },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        columnStyles: {
          0: { halign: "center", cellWidth: 35 },
          1: { halign: "left", cellWidth: 130 },
          2: { halign: "center", cellWidth: 35 },
          3: { halign: "center", cellWidth: 30 },
          4: { halign: "left", cellWidth: 43 },
        },
        didParseCell: (data) => {
          if (data.column.index === 2 && data.section === "body") {
            const s = String(data.cell.raw);
            if (s === "Non produit") data.cell.styles.textColor = [239, 68, 68];
            else if (s === "En cours") data.cell.styles.textColor = [245, 158, 11];
            else if (s === "Produit") data.cell.styles.textColor = [34, 197, 94];
            else if (s === "Validé") { data.cell.styles.textColor = [59, 130, 246]; data.cell.styles.fontStyle = "bold"; }
            else if (s === "Rejeté") data.cell.styles.textColor = [153, 27, 27];
          }
        },
        pageBreak: "auto",
        rowPageBreak: "avoid",
      });

      currentY = (doc as any).lastAutoTable.finalY + 3;

      // Summary bar
      if (currentY > MAX_Y - 10) { doc.addPage(); pageSections[doc.getNumberOfPages()] = `Activité ${act.code} — Livrables`; currentY = 16; }
      doc.setFillColor(226, 239, 218);
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN_L, currentY, CONTENT_W, 8, 1, 1, "FD");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(21, 128, 61);
      const livPct = actLivrables.length > 0 ? Math.round((livDone / actLivrables.length) * 100) : 0;
      doc.text(
        `Total : ${actLivrables.length} livrables  |  Produits / Validés : ${livDone}  |  En cours : ${livEnCours}  |  Non produits : ${livNon}  |  Taux de production : ${livPct}%`,
        PAGE_W / 2, currentY + 5.5, { align: "center" }
      );
    }
  }

  // ── Grand total summary page ─────────────────────────────
  doc.addPage();
  const summaryPage = doc.getNumberOfPages();
  pageSections[summaryPage] = "Récapitulatif général";
  let sumY = 16;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 78, 121);
  doc.text("RÉCAPITULATIF GÉNÉRAL", PAGE_W / 2, sumY + 9, { align: "center" });
  sumY += 18;

  // Budget summary table
  const summaryBody = activites.map((act) => {
    const actTaches = taches.filter((t) => t.activite_id === act.id);
    const actStIds = new Set(
      sousTaches.filter((st) => actTaches.some((t) => t.id === st.tache_id)).map((st) => st.id)
    );
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
      0: { cellWidth: 40 },
      1: { cellWidth: 73 },
      2: { halign: "right", cellWidth: 45 },
      3: { halign: "right", cellWidth: 43 },
      4: { halign: "right", cellWidth: 43 },
      5: { halign: "center", cellWidth: 29 },
    },
    didParseCell: (data) => {
      if (data.row.index === summaryBody.length && data.section === "body") {
        data.cell.styles.fillColor = [0, 0, 0];
        data.cell.styles.textColor = [255, 215, 0];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  sumY = (doc as any).lastAutoTable.finalY + 10;

  // Livrables summary table
  const livSummaryBody = activites.map((act) => {
    const actTaches = taches.filter((t) => t.activite_id === act.id);
    const actTacheIds = new Set(actTaches.map((t) => t.id));
    const actStIds = new Set(sousTaches.filter((st) => actTacheIds.has(st.tache_id)).map((st) => st.id));
    const actLiv = allLivrables.filter((l) => actTacheIds.has(l.tache_id) || (l.sous_tache_id && actStIds.has(l.sous_tache_id)));
    const done = actLiv.filter((l) => l.statut === "produit" || l.statut === "valide").length;
    const enCours = actLiv.filter((l) => l.statut === "en_cours").length;
    const nonP = actLiv.filter((l) => l.statut === "non_produit" || !l.statut).length;
    const pct = actLiv.length > 0 ? Math.round((done / actLiv.length) * 100) : 0;
    return [`${act.code}`, String(actLiv.length), String(done), String(enCours), String(nonP), `${pct}%`];
  });

  const livGlobalPct = grandTotalLiv > 0 ? Math.round((grandTotalLivDone / grandTotalLiv) * 100) : 0;
  livSummaryBody.push(["TOTAL", String(grandTotalLiv), String(grandTotalLivDone), "", "", `${livGlobalPct}%`]);

  autoTable(doc, {
    startY: sumY,
    margin: { left: MARGIN_L, right: MARGIN_R },
    tableWidth: CONTENT_W,
    head: [["Activité", "Total livrables", "Produits/Validés", "En cours", "Non produits", "Taux prod."]],
    body: livSummaryBody,
    headStyles: { fillColor: [29, 106, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, cellPadding: 2, textColor: [30, 30, 30] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: "center", cellWidth: 40 },
      2: { halign: "center", cellWidth: 45 },
      3: { halign: "center", cellWidth: 40 },
      4: { halign: "center", cellWidth: 40 },
      5: { halign: "center", cellWidth: 28 },
    },
    didParseCell: (data) => {
      if (data.row.index === livSummaryBody.length - 1 && data.section === "body") {
        data.cell.styles.fillColor = [0, 0, 0];
        data.cell.styles.textColor = [255, 215, 0];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // ── Apply headers/footers to all pages except cover ──────
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    const sectionTitle = pageSections[i] || "Rapport budgétaire et livrables";
    drawPageHeader(doc, logo, sectionTitle, annee);
    drawPageFooter(doc, logo, i, totalPages);
  }

  // ── Save ─────────────────────────────────────────────────
  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  doc.save(`Rapport_Budgetaire_Livrables_EFO_${annee}_${ts}.pdf`);
}
