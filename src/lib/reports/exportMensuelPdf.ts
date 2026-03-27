import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportData } from "@/lib/reportUtils";
import { fmtFCFA, fmtPct, getExecForST } from "@/lib/reportUtils";

export const exportMensuelPdf = (data: ReportData, annee: number, mois: number) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const moisNoms = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];

  // Header
  doc.setFontSize(16);
  doc.setTextColor(31, 78, 121);
  doc.text("ÉCOLE DE FORMATION EN AÉRONAUTIQUE (EFO)", 148, 15, { align: "center" });
  doc.setFontSize(13);
  doc.text(`RAPPORT MENSUEL D'EXÉCUTION DU PTA — ${moisNoms[mois - 1]} ${annee}`, 148, 24, { align: "center" });
  doc.setDrawColor(31, 78, 121);
  doc.line(20, 28, 277, 28);

  let yPos = 35;

  data.activites.forEach((act) => {
    if (yPos > 170) { doc.addPage(); yPos = 20; }

    doc.setFontSize(11);
    doc.setTextColor(31, 78, 121);
    doc.text(`${act.code} — ${act.libelle}`, 20, yPos);
    yPos += 6;

    const actTaches = data.taches.filter((t) => t.activite_id === act.id);
    const tableData: any[][] = [];

    actTaches.forEach((tache) => {
      const sts = data.sousTaches.filter((st) => st.tache_id === tache.id);
      sts.forEach((st) => {
        const exec = getExecForST(data.executions, st.id);
        const budgetPrevu = st.budget_prevu || 0;
        const montantRealise = exec?.montant_realise || 0;
        const tauxBudg = budgetPrevu > 0 ? Math.round((montantRealise / budgetPrevu) * 100) : 0;

        tableData.push([
          st.code,
          st.libelle.substring(0, 40),
          fmtFCFA(budgetPrevu),
          fmtFCFA(montantRealise),
          `${tauxBudg}%`,
          fmtPct(exec?.avancement_pct),
          exec?.statut?.replace("_", " ") || "Non démarré",
        ]);
      });
    });

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [["Code", "Sous-tâche", "Budget prévu", "Réalisé", "Taux budg.", "Avancement", "Statut"]],
        body: tableData,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [46, 117, 182], textColor: 255, fontSize: 7 },
        margin: { left: 20, right: 20 },
      });
      yPos = (doc as any).lastAutoTable.finalY + 8;
    }
  });

  // Alerts section
  if (yPos > 160) { doc.addPage(); yPos = 20; }
  doc.setFontSize(11);
  doc.setTextColor(200, 50, 50);
  doc.text("ALERTES — Sous-tâches en retard", 20, yPos);
  yPos += 6;

  const alerts: string[] = [];
  data.sousTaches.forEach((st) => {
    const exec = getExecForST(data.executions, st.id);
    if (!exec || exec.avancement_pct === 0) {
      const currentQ = Math.ceil(mois / 3);
      if ((currentQ >= 1 && st.trimestre_t1) || (currentQ >= 2 && st.trimestre_t2)) {
        alerts.push(`${st.code} — ${st.libelle} (0% d'avancement)`);
      }
    }
  });

  doc.setFontSize(8);
  doc.setTextColor(0);
  if (alerts.length === 0) {
    doc.text("Aucune alerte pour cette période.", 20, yPos);
  } else {
    alerts.slice(0, 15).forEach((a) => {
      if (yPos > 185) { doc.addPage(); yPos = 20; }
      doc.text(`• ${a}`, 22, yPos);
      yPos += 4;
    });
  }

  // Signature block
  yPos = Math.max(yPos + 15, 170);
  if (yPos > 185) { doc.addPage(); yPos = 150; }
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text("Établi par: ___________________________", 20, yPos);
  doc.text("Approuvé par: ___________________________", 160, yPos);
  doc.text("Date: _______________", 20, yPos + 8);
  doc.text("Date: _______________", 160, yPos + 8);

  doc.save(`Rapport_Mensuel_${moisNoms[mois - 1]}_${annee}.pdf`);
};
