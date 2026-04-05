
DO $$
DECLARE
  v_exercice_id UUID := '5c8fe683-0a34-4bb2-8125-ec66aa25f3bf';
BEGIN
  -- 1. Reset budget lines
  UPDATE public.sous_tache_lignes_budgetaires
  SET montant_prevu = 0, montant_engage = 0, montant_execute = 0, observations = NULL, updated_at = now()
  WHERE exercice_id = v_exercice_id;

  -- 2. Reset executions
  UPDATE public.executions
  SET montant_realise = 0, montant_engage = 0, avancement_pct = 0, statut = 'non_demarre', observations = NULL, date_maj = now(), updated_by = NULL
  WHERE exercice_id = v_exercice_id;

  -- 3. Reset sous-taches budget
  UPDATE public.sous_taches st
  SET budget_prevu = 0, updated_at = now()
  WHERE st.tache_id IN (
    SELECT t.id FROM public.taches t
    JOIN public.activites a ON a.id = t.activite_id
    WHERE a.exercice_id = v_exercice_id
  );

  -- 4. Reset taches budget
  UPDATE public.taches t
  SET budget_total = 0
  WHERE t.activite_id IN (
    SELECT id FROM public.activites WHERE exercice_id = v_exercice_id
  );

  -- 5. Reset activites budget
  UPDATE public.activites
  SET budget_total = 0
  WHERE exercice_id = v_exercice_id;

  -- 6. Reset exercice budget
  UPDATE public.exercices
  SET budget_total = 0
  WHERE id = v_exercice_id;

  -- 7. Reset extrants statuts
  UPDATE public.extrants e
  SET statut = 'non_produit', statut_mode = 'auto', date_production = NULL, date_validation = NULL, valide_par = NULL, rejete_motif = NULL, updated_at = now()
  WHERE e.activite_id IN (
    SELECT id FROM public.activites WHERE exercice_id = v_exercice_id
  );

  -- 8. Reset extrants criteres validation
  UPDATE public.extrants_criteres ec
  SET valide_auto = false, valide_manuellement = false
  WHERE ec.extrant_id IN (
    SELECT e.id FROM public.extrants e
    JOIN public.activites a ON a.id = e.activite_id
    WHERE a.exercice_id = v_exercice_id
  );
END;
$$;
