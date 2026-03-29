import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { addReportHeader, addPageFooters } from "./pdfHeader";

interface BudgetLineRow {
  code: string;
  libelle: string;
  total_prevu: number;
  total_execute: number;
  taux: number;
}

interface LivrableRow {
  tache_code: string;
  libelle: string;
  statut: string;
  date_production: string | null;
  fichier_nom: string | null;
}

function fmt(v: number) {
  return v.toLocaleString("fr-FR");
}

function statutLabel(s: string) {
  const map: Record<string, string> = {
    non_produit: "❌ Non produit",
    en_cours: "⏳ En cours",
    produit: "✅ Produit",
    valide: "✔️ Validé",
    rejete: "🔄 Rejeté",
  };
  return map[s] || s;
}

function tauxColor(t: number): [number, number, number] {
  if (t >= 100) return [0, 100, 0];
  if (t >= 75) return [34, 139, 34];
  if (t >= 50) return [245, 158, 11];
  if (t > 0) return [239, 68, 68];
  return [150, 150, 150];
}

export async function exportBudgetLivrablesPdf(
  annee: number,
  exerciceId: string,
  filterActiviteId?: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = 297;

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

  // Cover
  const startY = await addReportHeader(
    doc,
    "RAPPORT BUDGÉTAIRE ET LIVRABLES",
    `Exercice ${annee} — ${scope} — Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
  );

  let grandTotalPrevu = 0;
  let grandTotalExecute = 0;
  let grandTotalLiv = 0;
  let grandTotalLivDone = 0;
  let currentY = startY + 5;

  for (const act of activites) {
    const actTaches = taches.filter((t) => t.activite_id === act.id);

    // Activité header
    if (currentY > 170) { doc.addPage(); currentY = 20; }
    doc.setFillColor(31, 78, 121);
    doc.rect(15, currentY, pageW - 30, 10, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`ACTIVITÉ [${act.code}] — ${act.libelle}`, 18, currentY + 7);
    doc.setFontSize(8);
    doc.text(`Budget plafond : ${fmt(act.budget_total || 0)} FCFA`, pageW - 18, currentY + 7, { align: "right" });
    currentY += 14;

    let actTotalPrevu = 0;
    let actTotalExecute = 0;

    for (const tache of actTaches) {
      if (currentY > 170) { doc.addPage(); currentY = 20; }
      // Tâche header
      doc.setFillColor(46, 117, 182);
      doc.rect(15, currentY, pageW - 30, 8, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`Tâche [${tache.code}] — ${tache.libelle}`, 18, currentY + 5.5);
      doc.text(`Plafond : ${fmt(tache.budget_total || 0)} FCFA`, pageW - 18, currentY + 5.5, { align: "right" });
      currentY += 10;

      // Get consolidated budget lines for this tâche
      const tacheSts = sousTaches.filter((st) => st.tache_id === tache.id);
      const stIds = new Set(tacheSts.map((st) => st.id));
      const tacheLines = allLines.filter((l) => stIds.has(l.sous_tache_id));

      // Group by nomenclature code
      const grouped = new Map<string, { code: string; libelle: string; prevu: number; execute: number }>();
      for (const l of tacheLines) {
        const key = l.code_ligne;
        const existing = grouped.get(key);
        if (existing) {
          existing.prevu += l.montant_prevu;
          existing.execute += l.montant_execute;
        } else {
          grouped.set(key, { code: l.code_ligne, libelle: l.libelle_ligne, prevu: l.montant_prevu, execute: l.montant_execute });
        }
      }

      const budgetRows = Array.from(grouped.values()).sort((a, b) => a.code.localeCompare(b.code));
      let tachePrevu = 0;
      let tacheExecute = 0;

      if (budgetRows.length > 0) {
        const tableBody = budgetRows.map((r) => {
          tachePrevu += r.prevu;
          tacheExecute += r.execute;
          const taux = r.prevu > 0 ? Math.round((r.execute / r.prevu) * 1000) / 10 : 0;
          return [r.code, r.libelle.substring(0, 50), fmt(r.prevu), fmt(r.execute), `${taux}%`];
        });

        const tacheTaux = tachePrevu > 0 ? Math.round((tacheExecute / tachePrevu) * 1000) / 10 : 0;
        tableBody.push([`TOTAL ${tache.code}`, "", fmt(tachePrevu), fmt(tacheExecute), `${tacheTaux}%`]);

        autoTable(doc, {
          startY: currentY,
          head: [["Code", "Libellé", "Prévu", "Réalisé", "Taux"]],
          body: tableBody,
          margin: { left: 15, right: 15 },
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [214, 228, 240], textColor: [31, 78, 121], fontStyle: "bold" },
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 100 },
            2: { halign: "right", cellWidth: 30 },
            3: { halign: "right", cellWidth: 30 },
            4: { halign: "right", cellWidth: 20 },
          },
          didParseCell: (data) => {
            if (data.row.index === tableBody.length - 1) {
              data.cell.styles.fillColor = [214, 228, 240];
              data.cell.styles.fontStyle = "bold";
            }
            if (data.row.index % 2 === 0 && data.row.index < tableBody.length - 1) {
              data.cell.styles.fillColor = [235, 243, 251];
            }
          },
        });

        currentY = (doc as any).lastAutoTable.finalY + 3;
      } else {
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text("Aucune ligne budgétaire", 18, currentY + 4);
        currentY += 8;
      }

      actTotalPrevu += tachePrevu;
      actTotalExecute += tacheExecute;
    }

    // Activité total
    if (currentY > 185) { doc.addPage(); currentY = 20; }
    doc.setFillColor(31, 78, 121);
    doc.rect(15, currentY, pageW - 30, 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    const actTaux = actTotalPrevu > 0 ? Math.round((actTotalExecute / actTotalPrevu) * 1000) / 10 : 0;
    doc.text(`TOTAL ACTIVITÉ ${act.code}`, 18, currentY + 5.5);
    doc.text(`Prévu: ${fmt(actTotalPrevu)} | Réalisé: ${fmt(actTotalExecute)} | Taux: ${actTaux}%`, pageW - 18, currentY + 5.5, { align: "right" });
    currentY += 12;

    grandTotalPrevu += actTotalPrevu;
    grandTotalExecute += actTotalExecute;

    // Livrables section
    const actTacheIds = new Set(actTaches.map((t) => t.id));
    const actStIds = new Set(sousTaches.filter((st) => actTacheIds.has(st.tache_id)).map((st) => st.id));
    const actLivrables = allLivrables.filter(
      (l) => actTacheIds.has(l.tache_id) || (l.sous_tache_id && actStIds.has(l.sous_tache_id))
    );

    if (actLivrables.length > 0) {
      if (currentY > 170) { doc.addPage(); currentY = 20; }
      doc.setFillColor(29, 106, 59);
      doc.rect(15, currentY, pageW - 30, 8, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`📦 LIVRABLES — Activité ${act.code}`, 18, currentY + 5.5);
      currentY += 10;

      const livBody = actLivrables.map((l) => {
        const tache = taches.find((t) => t.id === l.tache_id);
        return [
          tache?.code || "",
          l.libelle.substring(0, 45),
          statutLabel(l.statut || "non_produit"),
          l.date_production || "—",
          l.fichier_nom || "—",
        ];
      });

      const livDone = actLivrables.filter((l) => l.statut === "produit" || l.statut === "valide").length;
      grandTotalLiv += actLivrables.length;
      grandTotalLivDone += livDone;

      autoTable(doc, {
        startY: currentY,
        head: [["Tâche", "Libellé du livrable", "Statut", "Date prod.", "Fichier"]],
        body: livBody,
        margin: { left: 15, right: 15 },
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [29, 106, 59], textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 80 },
          2: { cellWidth: 30 },
          3: { cellWidth: 22 },
          4: { cellWidth: 40 },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 3;

      // Livrable summary
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      const livPct = actLivrables.length > 0 ? Math.round((livDone / actLivrables.length) * 100) : 0;
      doc.text(`Total : ${actLivrables.length} livrables | Produits/Validés : ${livDone} | Taux de production : ${livPct}%`, 18, currentY + 3);
      currentY += 10;
    }

    // Page break between activités
    if (activites.indexOf(act) < activites.length - 1) {
      doc.addPage();
      currentY = 20;
    }
  }

  // Grand total page
  doc.addPage();
  currentY = 20;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 78, 121);
  doc.text("RÉCAPITULATIF GÉNÉRAL", pageW / 2, currentY, { align: "center" });
  currentY += 10;

  const summaryBody = activites.map((act) => {
    const actTaches = taches.filter((t) => t.activite_id === act.id);
    const actStIds = new Set(
      sousTaches.filter((st) => actTaches.some((t) => t.id === st.tache_id)).map((st) => st.id)
    );
    const actLines = allLines.filter((l) => actStIds.has(l.sous_tache_id));
    const prevu = actLines.reduce((s, l) => s + l.montant_prevu, 0);
    const execute = actLines.reduce((s, l) => s + l.montant_execute, 0);
    const taux = prevu > 0 ? Math.round((execute / prevu) * 1000) / 10 : 0;
    return [act.code, act.libelle.substring(0, 40), fmt(act.budget_total || 0), fmt(prevu), fmt(execute), `${taux}%`];
  });

  const grandTaux = grandTotalPrevu > 0 ? Math.round((grandTotalExecute / grandTotalPrevu) * 1000) / 10 : 0;
  summaryBody.push(["TOTAL", "", fmt(grandTotalPrevu), fmt(grandTotalPrevu), fmt(grandTotalExecute), `${grandTaux}%`]);

  autoTable(doc, {
    startY: currentY,
    head: [["Activité", "Libellé", "Plafond", "Total prévu", "Total réalisé", "Taux %"]],
    body: summaryBody,
    margin: { left: 15, right: 15 },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [31, 78, 121], textColor: [255, 255, 255] },
    didParseCell: (data) => {
      if (data.row.index === summaryBody.length - 1) {
        data.cell.styles.fillColor = [30, 30, 30];
        data.cell.styles.textColor = [255, 215, 0];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Livrables summary
  const livPctGlobal = grandTotalLiv > 0 ? Math.round((grandTotalLivDone / grandTotalLiv) * 100) : 0;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Total livrables PTA : ${grandTotalLiv} | Produits/Validés : ${grandTotalLivDone} | Taux global : ${livPctGlobal}%`, 18, currentY);

  addPageFooters(doc);
  doc.save(`Rapport_Budget_Livrables_${annee}.pdf`);
}
