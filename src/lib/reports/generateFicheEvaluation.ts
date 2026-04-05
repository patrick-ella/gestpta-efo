import * as XLSX from "xlsx";
import { format } from "date-fns";

interface AgentInfo {
  nom_complet: string;
  matricule?: string | null;
  direction?: string | null;
  service?: string | null;
  poste_travail?: string | null;
  anciennete_poste?: string | null;
  date_recrutement?: string | null;
  date_reclassement?: string | null;
}

interface Assignation {
  sous_tache_libelle: string;
  poids_objectif: number;
  date_limite?: string | null;
  extrants: { libelle: string }[];
  avancement_pct: number;
  note_objectif?: number | null;
}

interface EvalData {
  evaluateur_nom?: string;
  date_evaluation?: string | null;
  responsabilite_r1?: string | null;
  responsabilite_r2?: string | null;
  responsabilite_r3?: string | null;
  responsabilite_r4?: string | null;
  responsabilite_r5?: string | null;
  modifications_taches?: string | null;
  comp_assiduite?: number | null;
  comp_responsabilite?: number | null;
  comp_communication?: number | null;
  comp_quantite_travail?: number | null;
  comp_qualite_travail?: number | null;
  comp_esprit_critique?: number | null;
  comp_organisation?: number | null;
  comp_actualisation?: number | null;
  comp_initiative?: number | null;
  comp_discretion?: number | null;
  comp_habiletes?: number | null;
  note_realisation?: number | null;
  note_comp_comportement?: number | null;
  note_comp_performance?: number | null;
  note_comp_pro?: number | null;
  note_globale?: number | null;
  appreciation_globale?: string | null;
  points_forts?: string | null;
  points_ameliorer?: string | null;
  besoins_formation?: any[];
  elements_favorables?: string | null;
  elements_defavorables?: string | null;
  commentaire_agent?: string | null;
  commentaire_evaluateur?: string | null;
}

export function generateFicheEvaluation(
  agent: AgentInfo,
  evaluation: EvalData,
  assignations: Assignation[],
  exercice: number
): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Identification
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["FORMULAIRE D'EVALUATION ANNUELLE DE LA PERFORMANCE DU PERSONNEL"],
    [], ["ANNEE/EXERCICE", exercice],
    ["NOM DE L'AGENT ÉVALUÉ :", agent.nom_complet],
    ["MATRICULE :", agent.matricule ?? ""],
    ["INTITULÉ DU POSTE DE TRAVAIL :", agent.poste_travail ?? ""],
    ["ANCIENNETÉ AU POSTE :", agent.anciennete_poste ?? ""],
    ["DATE DE RECRUTEMENT :", agent.date_recrutement ?? ""],
    ["DIRECTION / SERVICE :", `${agent.direction ?? ""} / ${agent.service ?? ""}`],
    ["SUPÉRIEUR HIÉRARCHIQUE / ÉVALUATEUR :", evaluation.evaluateur_nom ?? ""],
    ["DATE DU DERNIER RECLASSEMENT :", agent.date_reclassement ?? ""],
    ["DATE DE L'ÉVALUATION :", evaluation.date_evaluation ? format(new Date(evaluation.date_evaluation), "dd/MM/yyyy") : ""],
  ]), "1-IDENTIFICATION");

  // Sheet 2: Mission
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["2. RAPPEL DES MISSIONS DU POSTE"],
    ["R1 :", evaluation.responsabilite_r1 ?? ""],
    ["R2 :", evaluation.responsabilite_r2 ?? ""],
    ["R3 :", evaluation.responsabilite_r3 ?? ""],
    ["R4 :", evaluation.responsabilite_r4 ?? ""],
    ["R5 :", evaluation.responsabilite_r5 ?? ""],
    [], ["Modifications des tâches :", evaluation.modifications_taches ?? ""],
  ]), "2-MISSION DU POSTE");

  // Sheet 3: Résultats
  const resultsRows: any[][] = [
    ["3. RÉSULTATS OBTENUS AU COURS DE L'ANNÉE ÉVALUÉE"],
    [], ["N°", "Objectifs", "Délais", "Critères de réussite", "Pondération (%)", "Résultats obtenus", "Notation (sur 10)"],
  ];
  assignations.forEach((a, idx) => {
    resultsRows.push([
      idx + 1, a.sous_tache_libelle,
      a.date_limite ? format(new Date(a.date_limite), "dd/MM/yyyy") : "",
      a.extrants.map(e => e.libelle).join("\n"),
      a.poids_objectif, `${a.avancement_pct}%`,
      a.note_objectif ?? "",
    ]);
  });
  resultsRows.push([], ["", "", "", "TOTAL",
    assignations.reduce((s, a) => s + a.poids_objectif, 0),
    "", evaluation.note_realisation ?? ""]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resultsRows), "3-RESULTATS OBTENUS");

  // Sheet 4: Compétences
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["4. ÉVALUATION DES COMPÉTENCES"], [],
    ["COMPÉTENCES COMPORTEMENTALES"],
    ["N°", "Indicateurs", "Note /5", "Actions correctives"],
    ["1", "Assiduité et ponctualité", evaluation.comp_assiduite ?? "", ""],
    ["2", "Sens des responsabilités", evaluation.comp_responsabilite ?? "", ""],
    ["3", "Communication", evaluation.comp_communication ?? "", ""],
    [], ["COMPÉTENCES LIÉES À LA PERFORMANCE"],
    ["N°", "Indicateurs", "Note /5", "Actions correctives"],
    ["1", "Quantité de travail", evaluation.comp_quantite_travail ?? "", ""],
    ["2", "Qualité du travail", evaluation.comp_qualite_travail ?? "", ""],
    ["3", "Esprit critique et jugement", evaluation.comp_esprit_critique ?? "", ""],
    [], ["COMPÉTENCES PROFESSIONNELLES"],
    ["N°", "Indicateurs", "Note /5", "Actions correctives"],
    ["1", "Organisation", evaluation.comp_organisation ?? "", ""],
    ["2", "Actualisation des compétences", evaluation.comp_actualisation ?? "", ""],
    ["3", "Initiative", evaluation.comp_initiative ?? "", ""],
    ["4", "Discrétion", evaluation.comp_discretion ?? "", ""],
    ["5", "Habiletés physiques", evaluation.comp_habiletes ?? "", ""],
  ]), "4-GRILLE EVALUATION");

  // Sheet 5: Rendement global
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["5. RENDEMENT GLOBAL"], [],
    ["Domaine d'évaluation", "Note obtenue"],
    ["Réalisation des objectifs", evaluation.note_realisation ?? ""],
    ["Compétences comportementales", evaluation.note_comp_comportement ?? ""],
    ["Compétences liées à la performance", evaluation.note_comp_performance ?? ""],
    ["Compétences professionnelles", evaluation.note_comp_pro ?? ""],
    ["NOTE GLOBALE", `${evaluation.note_globale ?? 0} / 20`],
    [], ["Appréciation globale :", evaluation.appreciation_globale ?? ""],
    [], ["5.2 APPRÉCIATION DES FORCES ET FAIBLESSES"],
    ["Principaux points forts :", evaluation.points_forts ?? ""],
    ["Points à améliorer :", evaluation.points_ameliorer ?? ""],
  ]), "5-RENDEMENT GLOBAL");

  // Sheet 6: Développement
  const devRows: any[][] = [
    ["6. BESOINS DE DÉVELOPPEMENT DES COMPÉTENCES"], [],
    ["Besoins", "Mesures à prendre", "Calendrier", "Budget estimatif"],
  ];
  (evaluation.besoins_formation ?? []).forEach((b: any) => {
    devRows.push([b.besoin ?? "", b.mesure ?? "", b.calendrier ?? "", b.budget ?? ""]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(devRows), "6-DEVELOPPEMENT");

  // Sheet 7: Conclusion
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["7. ÉLÉMENTS CONTEXTUELS"],
    ["Éléments favorables :", evaluation.elements_favorables ?? ""],
    ["Éléments défavorables :", evaluation.elements_defavorables ?? ""],
    [], ["8. Commentaires de l'agent évalué :", evaluation.commentaire_agent ?? ""],
    [], ["9. Commentaires de l'évaluateur :", evaluation.commentaire_evaluateur ?? ""],
  ]), "7_8_9-CONCLUSION");

  // Sheet: Récapitulatif
  const recapRows: any[][] = [
    [`RÉCAPITULATIF — ÉVALUATION ANNUELLE ${exercice}`], [],
    ["Nom :", agent.nom_complet, "Matricule :", agent.matricule ?? ""],
    ["Poste :", agent.poste_travail ?? ""],
    ["Direction/Service :", `${agent.direction ?? ""}/${agent.service ?? ""}`],
    [], ["1. RÉSULTATS OBTENUS"],
    ["Objectifs", "Note (/10)", "Poids", "Note pondérée"],
  ];
  assignations.forEach(a => {
    const np = a.note_objectif && a.poids_objectif
      ? ((a.note_objectif * a.poids_objectif) / 100).toFixed(2)
      : "";
    recapRows.push([a.sous_tache_libelle, a.note_objectif ?? "", `${a.poids_objectif}%`, np]);
  });
  recapRows.push(["TOTAL réalisation", "", "", evaluation.note_realisation ?? ""]);
  recapRows.push([], ["2. COMPÉTENCES"], ["Type", "Note"],
    ["Comportementales", evaluation.note_comp_comportement ?? ""],
    ["Performance", evaluation.note_comp_performance ?? ""],
    ["Professionnelles", evaluation.note_comp_pro ?? ""],
    [], ["NOTE GLOBALE", `${evaluation.note_globale ?? 0} / 20`],
    ["Appréciation :", evaluation.appreciation_globale ?? ""]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(recapRows), "A IMPRIMER");

  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}
