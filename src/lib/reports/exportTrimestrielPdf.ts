import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportData } from "@/lib/reportUtils";
import { fmtFCFA, fmtPct, getExecForST } from "@/lib/reportUtils";
import { addReportHeader, addPageFooters } from "./pdfHeader";

export const exportTrimestrielPdf = async (data: ReportData, annee: number, trimestre: number) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const trLabel = `T${trimestre}`;
  const trField = `trimestre_t${trimestre}` as const;

  let yPos = await addReportHeader(
    doc,
    "RAPPORT TRIMESTRIEL D'EXÉCUTION DU PTA",
    `Exercice ${annee} — Période : ${trLabel} ${annee}`
  );

  // Section 1: Comparative table
  doc.setFontSize(11);
  doc.setTextColor(31, 78, 121);
  doc.text("1. Tableau comparatif prévu vs réalisé par activité", 20, yPos);
  yPos += 6;

  const compData = data.activites.map((act) => {
    const actTaches = data.taches.filter((t) => t.activite_id === act.id);
    const sts = actTaches.flatMap((t) =>
      data.sousTaches.filter((st) => st.tache_id === t.id && (st as any)[trField])
    );
    const budgetPrevu = sts.reduce((s, st) => s + (st.budget_prevu || 0), 0);
    const budgetRealise = sts.reduce((s, st) => {
      const exec = getExecForST(data.executions, st.id);
      return s + (exec?.montant_realise || 0);
    }, 0);
    const avgAvancement = sts.length > 0
      ? sts.reduce((s, st) => s + (getExecForST(data.executions, st.id)?.avancement_pct || 0), 0) / sts.length
      : 0;

    return [
      act.code,
      act.libelle.substring(0, 35),
      fmtFCFA(budgetPrevu),
      fmtFCFA(budgetRealise),
      budgetPrevu > 0 ? `${Math.round((budgetRealise / budgetPrevu) * 100)}%` : "0%",
      fmtPct(avgAvancement),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [["Code", "Activité", "Budget prévu", "Budget réalisé", "Taux budg.", "Avancement"]],
    body: compData,
    theme: "grid",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [31, 78, 121], textColor: 255 },
    margin: { left: 20, right: 20 },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Section 2: KPI
  if (yPos > 160) { doc.addPage(); yPos = 20; }
  doc.setFontSize(11);
  doc.setTextColor(31, 78, 121);
  doc.text("2. Indicateurs du Cadre Logique", 20, yPos);
  yPos += 6;

  const kpiData = data.kpis.map((k) => [
    k.code,
    k.libelle.substring(0, 40),
    k.cible_2026 || "—",
    k.valeur_realisee || "—",
    k.mode_calcul || "—",
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Code", "Indicateur", "Cible 2026", "Réalisé", "Mode calcul"]],
    body: kpiData,
    theme: "grid",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [46, 117, 182], textColor: 255 },
    margin: { left: 20, right: 20 },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Section 3: Variance analysis
  if (yPos > 160) { doc.addPage(); yPos = 20; }
  doc.setFontSize(11);
  doc.setTextColor(31, 78, 121);
  doc.text("3. Analyse des écarts budgétaires", 20, yPos);
  yPos += 6;

  const variances: any[][] = [];
  data.sousTaches.forEach((st) => {
    if (!(st as any)[trField]) return;
    const exec = getExecForST(data.executions, st.id);
    const budgetPrevu = st.budget_prevu || 0;
    const realise = exec?.montant_realise || 0;
    if (budgetPrevu === 0) return;
    const ecart = ((realise - budgetPrevu) / budgetPrevu) * 100;
    if (Math.abs(ecart) > 20) {
      variances.push([
        st.code,
        st.libelle.substring(0, 35),
        fmtFCFA(budgetPrevu),
        fmtFCFA(realise),
        `${ecart > 0 ? "+" : ""}${Math.round(ecart)}%`,
      ]);
    }
  });

  if (variances.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["Code", "Sous-tâche", "Prévu", "Réalisé", "Écart"]],
      body: variances,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 50, 50], textColor: 255 },
      margin: { left: 20, right: 20 },
    });
  } else {
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text("Aucun écart significatif (>20%) détecté.", 22, yPos);
  }

  addPageFooters(doc);
  doc.save(`Rapport_Trimestriel_${trLabel}_${annee}.pdf`);
};
