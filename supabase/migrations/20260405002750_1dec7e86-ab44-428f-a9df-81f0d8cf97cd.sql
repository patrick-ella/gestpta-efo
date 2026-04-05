
-- Add montant_engage to sous_tache_lignes_budgetaires
ALTER TABLE public.sous_tache_lignes_budgetaires
  ADD COLUMN IF NOT EXISTS montant_engage bigint NOT NULL DEFAULT 0;

-- Add montant_engage to executions
ALTER TABLE public.executions
  ADD COLUMN IF NOT EXISTS montant_engage bigint DEFAULT 0;

-- Update cascade trigger to also sum montant_engage
CREATE OR REPLACE FUNCTION public.cascade_execution_from_lignes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_st_id UUID;
  v_ex_id UUID;
  v_total_execute BIGINT;
  v_total_prevu BIGINT;
  v_total_engage BIGINT;
BEGIN
  v_st_id := COALESCE(NEW.sous_tache_id, OLD.sous_tache_id);
  v_ex_id := COALESCE(NEW.exercice_id, OLD.exercice_id);

  SELECT COALESCE(SUM(montant_execute), 0),
         COALESCE(SUM(montant_prevu), 0),
         COALESCE(SUM(montant_engage), 0)
  INTO v_total_execute, v_total_prevu, v_total_engage
  FROM public.sous_tache_lignes_budgetaires
  WHERE sous_tache_id = v_st_id AND exercice_id = v_ex_id;

  UPDATE public.sous_taches SET budget_prevu = v_total_prevu WHERE id = v_st_id;

  INSERT INTO public.executions (sous_tache_id, exercice_id, montant_realise, montant_engage, date_maj, updated_by)
  VALUES (v_st_id, v_ex_id, v_total_execute, v_total_engage, now(), auth.uid())
  ON CONFLICT (sous_tache_id, exercice_id)
  DO UPDATE SET montant_realise = v_total_execute, montant_engage = v_total_engage, date_maj = now(), updated_by = auth.uid();

  RETURN COALESCE(NEW, OLD);
END;
$function$;
