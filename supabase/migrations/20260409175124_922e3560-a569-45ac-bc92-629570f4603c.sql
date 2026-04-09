
CREATE OR REPLACE FUNCTION public.recalculate_extrant_statut(p_extrant_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_criteres INT;
  v_criteres_valides INT;
  v_new_statut TEXT;
  v_current_statut TEXT;
  v_statut_mode TEXT;
BEGIN
  SELECT statut, statut_mode INTO v_current_statut, v_statut_mode
  FROM public.extrants WHERE id = p_extrant_id;

  IF v_statut_mode = 'manuel' THEN
    RETURN;
  END IF;

  UPDATE public.extrants_criteres ec
  SET valide_auto = EXISTS (
    SELECT 1 FROM public.criteres_sous_taches cst
    JOIN public.executions e ON e.sous_tache_id = cst.sous_tache_id
    WHERE cst.critere_id = ec.id
      AND cst.condition_type = 'avancement_100'
      AND e.avancement_pct = 100
  )
  WHERE ec.extrant_id = p_extrant_id
    AND ec.type_critere = 'binaire';

  UPDATE public.extrants_criteres ec
  SET valide_auto = EXISTS (
    SELECT 1 FROM public.criteres_sous_taches cst
    JOIN public.executions e ON e.sous_tache_id = cst.sous_tache_id
    WHERE cst.critere_id = ec.id
      AND cst.condition_type = 'avancement_seuil'
      AND e.avancement_pct >= cst.condition_seuil
  )
  WHERE ec.extrant_id = p_extrant_id
    AND ec.type_critere = 'quantitatif';

  UPDATE public.extrants_criteres ec
  SET valide_auto = EXISTS (
    SELECT 1 FROM public.criteres_sous_taches cst
    JOIN public.executions e ON e.sous_tache_id = cst.sous_tache_id
    WHERE cst.critere_id = ec.id
      AND cst.condition_type = 'date_avant'
      AND e.avancement_pct = 100
      AND e.date_maj::DATE <= ec.date_echeance
  )
  WHERE ec.extrant_id = p_extrant_id
    AND ec.type_critere = 'date';

  UPDATE public.extrants_criteres
  SET valide_final = COALESCE(valide_auto, false) OR COALESCE(valide_manuellement, false)
  WHERE extrant_id = p_extrant_id;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE valide_final = true)
  INTO v_total_criteres, v_criteres_valides
  FROM public.extrants_criteres
  WHERE extrant_id = p_extrant_id;

  IF v_total_criteres = 0 THEN
    v_new_statut := 'non_produit';
  ELSIF v_criteres_valides = 0 THEN
    v_new_statut := 'non_produit';
  ELSIF v_criteres_valides < v_total_criteres THEN
    v_new_statut := 'en_cours';
  ELSE
    v_new_statut := 'produit';
    UPDATE public.extrants
    SET date_production = CURRENT_DATE
    WHERE id = p_extrant_id
      AND date_production IS NULL;
  END IF;

  UPDATE public.extrants
  SET statut = v_new_statut,
      statut_mode = 'auto',
      updated_at = now()
  WHERE id = p_extrant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
