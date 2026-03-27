import * as XLSX from "xlsx";
import type { ReportData } from "@/lib/reportUtils";

export const exportBudgetExcel = (data: ReportData, annee: number) => {
  const wb = XLSX.utils.book_new();
  const headers = ["Réf", "Activité", "Mode d'exécution", "Budget prévu (FCFA)"];
  const rows: any[][] = [headers];

  let grandTotal = 0;

  data.activites.forEach((act) => {
    const actTaches = data.taches.filter((t) => t.activite_id === act.id);
    rows.push([act.code, act.libelle, "", act.budget_total || 0]);
    grandTotal += act.budget_total || 0;

    actTaches.forEach((tache) => {
      const sts = data.sousTaches.filter((st) => st.tache_id === tache.id);
      rows.push([tache.code, `  ${tache.libelle}`, "", tache.budget_total || 0]);

      sts.forEach((st) => {
        rows.push([st.code, `    ${st.libelle}`, st.mode_execution || "", st.budget_prevu || 0]);
      });
    });
  });

  rows.push(["", "TOTAL GÉNÉRAL", "", grandTotal]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 14 }, { wch: 45 }, { wch: 20 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws, `Budget ${annee}`);
  XLSX.writeFile(wb, `Recapitulatif_Budget_${annee}.xlsx`);
};
