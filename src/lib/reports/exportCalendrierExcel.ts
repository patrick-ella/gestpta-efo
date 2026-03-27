import * as XLSX from "xlsx";
import type { ReportData } from "@/lib/reportUtils";

export const exportCalendrierExcel = (data: ReportData, annee: number) => {
  const wb = XLSX.utils.book_new();
  const headers = [
    "Référence", "Sous-activité",
    "T1 (Jan-Mar)", "T2 (Avr-Jun)", "T3 (Jul-Sep)", "T4 (Oct-Déc)",
  ];
  const rows: any[][] = [headers];

  data.activites.forEach((act) => {
    rows.push([act.code, act.libelle, "", "", "", ""]);
    const actTaches = data.taches.filter((t) => t.activite_id === act.id);

    actTaches.forEach((tache) => {
      const sts = data.sousTaches.filter((st) => st.tache_id === tache.id);
      sts.forEach((st) => {
        rows.push([
          st.code,
          st.libelle,
          st.trimestre_t1 ? "✓" : "",
          st.trimestre_t2 ? "✓" : "",
          st.trimestre_t3 ? "✓" : "",
          st.trimestre_t4 ? "✓" : "",
        ]);
      });
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 14 }, { wch: 45 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, `Calendrier ${annee}`);
  XLSX.writeFile(wb, `Calendrier_Trimestriel_${annee}.xlsx`);
};
