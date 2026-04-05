export function suggestNote(avancementPct: number): number {
  if (avancementPct >= 100) return 9.5;
  if (avancementPct >= 80) return 7.5;
  if (avancementPct >= 60) return 5.5;
  if (avancementPct >= 30) return 3.5;
  return 1.5;
}

export function calculateNoteRealisation(
  objectives: { note: number; poids: number }[]
): number {
  const total = objectives.reduce(
    (sum, o) => sum + (o.note * o.poids) / 100,
    0
  );
  return Math.round(total * 100) / 100;
}

export function calculateCompScores(comp: {
  assiduite?: number | null;
  responsabilite?: number | null;
  communication?: number | null;
  quantite_travail?: number | null;
  qualite_travail?: number | null;
  esprit_critique?: number | null;
  organisation?: number | null;
  actualisation?: number | null;
  initiative?: number | null;
  discretion?: number | null;
  habiletes?: number | null;
}) {
  const avg = (vals: (number | null | undefined)[]) => {
    const valid = vals.filter((v): v is number => v != null && v > 0);
    return valid.length > 0 ? valid.reduce((s, n) => s + n, 0) / valid.length : 0;
  };

  const noteComp = avg([comp.assiduite, comp.responsabilite, comp.communication]);
  const notePerf = avg([comp.quantite_travail, comp.qualite_travail, comp.esprit_critique]);
  const notePro = avg([comp.organisation, comp.actualisation, comp.initiative, comp.discretion, comp.habiletes]);

  return {
    noteComp: Math.round(noteComp * 100) / 100,
    notePerf: Math.round(notePerf * 100) / 100,
    notePro: Math.round(notePro * 100) / 100,
  };
}

export function calculateNoteGlobale(
  noteRealisation: number,
  noteComp: number,
  notePerf: number
): number {
  // Réalisation /10 + Comportement /5 + Autres /5 = /20
  return Math.round((noteRealisation + noteComp + notePerf) * 100) / 100;
}

export function getAppreciation(note: number): string {
  if (note < 11) return "Ne rencontre définitivement pas les exigences du poste";
  if (note < 13) return "Rencontre difficilement toutes les exigences du poste";
  if (note < 15) return "Rencontre de façon habituelle les exigences normales du poste";
  if (note < 18) return "Dépasse fréquemment les exigences normales du poste";
  return "Dépasse largement et de façon constante les exigences du poste";
}
