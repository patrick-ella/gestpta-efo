import * as XLSX from "xlsx";
import type { ReportData } from "@/lib/reportUtils";
import { getExecForST } from "@/lib/reportUtils";

const hex = (color: string) => color.replace("#", "");

export const exportPtaExcel = (data: ReportData, annee: number) => {
  const wb = XLSX.utils.book_new();

  const headers = [
    "N°", "Code", "Activités", "Objectif Opérationnel", "Codes tâches",
    "Tâches", "Code sous-tâches", "Sous-Tâches", "Livrable attendu",
    "Budget prévu (FCFA)", "Ligne budgétaire", "Mode d'exécution",
    "Sources de financement", "Responsable", "Ressources humaines",
    "Risques", "Mesures d'atténuation", "État d'avancement (%)", "Observations",
  ];

  const rows: any[][] = [headers];
  const rowStyles: Array<"header" | "activity" | "task" | "st-odd" | "st-even" | "total"> = ["header"];

  let grandBudget = 0;
  let num = 0;

  data.activites.forEach((act) => {
    num++;
    const actTaches = data.taches.filter((t) => t.activite_id === act.id);

    rows.push([
      num, act.code, act.libelle, act.objectif_operationnel || "",
      "", "", "", "", "", act.budget_total || 0,
      "", "", "", "", "", "", "", "", "",
    ]);
    rowStyles.push("activity");
    grandBudget += act.budget_total || 0;

    actTaches.forEach((tache) => {
      const tacheSTs = data.sousTaches.filter((st) => st.tache_id === tache.id);

      rows.push([
        "", tache.code, "", "", tache.code, tache.libelle,
        "", "", tache.livrables || "", tache.budget_total || 0,
        "", "", "", "", "", "", "", "", "",
      ]);
      rowStyles.push("task");

      tacheSTs.forEach((st, idx) => {
        const exec = getExecForST(data.executions, st.id);
        rows.push([
          "", "", "", "", "", "", st.code, st.libelle,
          "", st.budget_prevu || 0, st.lignes_budgetaires || "",
          st.mode_execution || "", st.sources_financement || "",
          st.responsable || "", st.ressources_humaines || "",
          st.risques || "", st.mesures_attenuation || "",
          exec?.avancement_pct ?? 0, exec?.observations || "",
        ]);
        rowStyles.push(idx % 2 === 0 ? "st-odd" : "st-even");
      });
    });
  });

  // Grand total
  rows.push(["", "", "TOTAL GÉNÉRAL", "", "", "", "", "", "", grandBudget,
    "", "", "", "", "", "", "", "", ""]);
  rowStyles.push("total");

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 5 }, { wch: 12 }, { wch: 35 }, { wch: 30 }, { wch: 12 },
    { wch: 35 }, { wch: 14 }, { wch: 35 }, { wch: 30 }, { wch: 18 },
    { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 },
    { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, `PTA ${annee}`);
  XLSX.writeFile(wb, `PTA_EFO_${annee}_complet.xlsx`);
};
