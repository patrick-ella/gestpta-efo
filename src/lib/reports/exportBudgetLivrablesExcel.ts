import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

function fmt(v: number) {
  return v;
}

export async function exportBudgetLivrablesExcel(
  annee: number,
  exerciceId: string,
  filterActiviteId?: string
) {
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

  const wb = XLSX.utils.book_new();

  // Sheet 1: Budget consolidé
  const budgetHeaders = [
    "Activité code", "Activité libellé", "Tâche code", "Tâche libellé", "Plafond tâche",
    "Code ligne", "Libellé ligne", "Montant prévu", "Montant réalisé", "Taux exécution %",
  ];
  const budgetRows: any[][] = [budgetHeaders];

  for (const act of activites) {
    const actTaches = taches.filter((t) => t.activite_id === act.id);
    for (const tache of actTaches) {
      const tacheSts = sousTaches.filter((st) => st.tache_id === tache.id);
      const stIds = new Set(tacheSts.map((st) => st.id));
      const tacheLines = allLines.filter((l) => stIds.has(l.sous_tache_id));

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

      const sorted = Array.from(grouped.values()).sort((a, b) => a.code.localeCompare(b.code));
      for (const r of sorted) {
        const taux = r.prevu > 0 ? Math.round((r.execute / r.prevu) * 1000) / 10 : 0;
        budgetRows.push([act.code, act.libelle, tache.code, tache.libelle, tache.budget_total || 0, r.code, r.libelle, r.prevu, r.execute, taux]);
      }
    }
  }

  const ws1 = XLSX.utils.aoa_to_sheet(budgetRows);
  ws1["!cols"] = [
    { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 35 }, { wch: 18 },
    { wch: 10 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Budget consolidé");

  // Sheet 2: Livrables
  const livHeaders = ["Activité code", "Activité libellé", "Tâche code", "Tâche libellé", "Libellé livrable", "Statut", "Date de production", "Fichier"];
  const livRows: any[][] = [livHeaders];

  for (const act of activites) {
    const actTaches = taches.filter((t) => t.activite_id === act.id);
    const actTacheIds = new Set(actTaches.map((t) => t.id));
    const actStIds = new Set(sousTaches.filter((st) => actTacheIds.has(st.tache_id)).map((st) => st.id));
    const actLivrables = allLivrables.filter(
      (l) => actTacheIds.has(l.tache_id) || (l.sous_tache_id && actStIds.has(l.sous_tache_id))
    );

    for (const l of actLivrables) {
      const tache = taches.find((t) => t.id === l.tache_id);
      livRows.push([
        act.code, act.libelle, tache?.code || "", tache?.libelle || "",
        l.libelle, l.statut || "non_produit", l.date_production || "", l.fichier_nom || "",
      ]);
    }
  }

  const ws2 = XLSX.utils.aoa_to_sheet(livRows);
  ws2["!cols"] = [
    { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 30 },
    { wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Livrables");

  // Sheet 3: Récapitulatif
  const recapHeaders = ["Activité", "Libellé", "Plafond", "Total prévu", "Total réalisé", "Taux exec %", "Nb livrables", "Nb produits", "Taux livrables %"];
  const recapRows: any[][] = [recapHeaders];

  let grandPrevu = 0, grandExecute = 0, grandLiv = 0, grandLivDone = 0;

  for (const act of activites) {
    const actTaches = taches.filter((t) => t.activite_id === act.id);
    const actTacheIds = new Set(actTaches.map((t) => t.id));
    const actStIds = new Set(sousTaches.filter((st) => actTacheIds.has(st.tache_id)).map((st) => st.id));
    const actLines = allLines.filter((l) => actStIds.has(l.sous_tache_id));
    const prevu = actLines.reduce((s, l) => s + l.montant_prevu, 0);
    const execute = actLines.reduce((s, l) => s + l.montant_execute, 0);
    const taux = prevu > 0 ? Math.round((execute / prevu) * 1000) / 10 : 0;

    const actLivrables = allLivrables.filter(
      (l) => actTacheIds.has(l.tache_id) || (l.sous_tache_id && actStIds.has(l.sous_tache_id))
    );
    const livDone = actLivrables.filter((l) => l.statut === "produit" || l.statut === "valide").length;
    const livPct = actLivrables.length > 0 ? Math.round((livDone / actLivrables.length) * 100) : 0;

    recapRows.push([act.code, act.libelle, act.budget_total || 0, prevu, execute, taux, actLivrables.length, livDone, livPct]);

    grandPrevu += prevu;
    grandExecute += execute;
    grandLiv += actLivrables.length;
    grandLivDone += livDone;
  }

  const grandTaux = grandPrevu > 0 ? Math.round((grandExecute / grandPrevu) * 1000) / 10 : 0;
  const grandLivPct = grandLiv > 0 ? Math.round((grandLivDone / grandLiv) * 100) : 0;
  recapRows.push(["TOTAL", "", grandPrevu, grandPrevu, grandExecute, grandTaux, grandLiv, grandLivDone, grandLivPct]);

  const ws3 = XLSX.utils.aoa_to_sheet(recapRows);
  ws3["!cols"] = [
    { wch: 12 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, "Récapitulatif");

  XLSX.writeFile(wb, `Rapport_Budget_Livrables_${annee}.xlsx`);
}
