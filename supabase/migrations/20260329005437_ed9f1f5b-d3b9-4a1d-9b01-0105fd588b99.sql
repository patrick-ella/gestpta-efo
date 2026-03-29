-- Drop the trigger that auto-calculates tache budget from sous-taches
DROP TRIGGER IF EXISTS trg_sync_tache_budget ON sous_taches;

-- Create a new trigger that cascades activite and exercice budgets when tache budget changes
CREATE OR REPLACE FUNCTION sync_activite_budget_from_taches()
RETURNS TRIGGER AS $$
DECLARE
  v_activite_id uuid;
  v_exercice_id uuid;
BEGIN
  SELECT activite_id INTO v_activite_id FROM taches WHERE id = COALESCE(NEW.id, OLD.id);
  UPDATE activites SET budget_total = (
    SELECT COALESCE(SUM(budget_total), 0) FROM taches WHERE activite_id = v_activite_id
  ) WHERE id = v_activite_id;
  
  SELECT exercice_id INTO v_exercice_id FROM activites WHERE id = v_activite_id;
  UPDATE exercices SET budget_total = (
    SELECT COALESCE(SUM(budget_total), 0) FROM activites WHERE exercice_id = v_exercice_id
  ) WHERE id = v_exercice_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER trg_sync_activite_from_taches
  AFTER INSERT OR UPDATE OF budget_total OR DELETE
  ON taches
  FOR EACH ROW
  EXECUTE FUNCTION sync_activite_budget_from_taches();

-- Update cascade trigger to also update sous_tache.budget_prevu from lines sum
CREATE OR REPLACE FUNCTION cascade_execution_from_lignes()
RETURNS TRIGGER AS $$
DECLARE
  v_st_id UUID;
  v_ex_id UUID;
  v_total_execute BIGINT;
  v_total_prevu BIGINT;
BEGIN
  v_st_id := COALESCE(NEW.sous_tache_id, OLD.sous_tache_id);
  v_ex_id := COALESCE(NEW.exercice_id, OLD.exercice_id);

  SELECT COALESCE(SUM(montant_execute), 0), COALESCE(SUM(montant_prevu), 0)
  INTO v_total_execute, v_total_prevu
  FROM public.sous_tache_lignes_budgetaires
  WHERE sous_tache_id = v_st_id AND exercice_id = v_ex_id;

  UPDATE public.sous_taches SET budget_prevu = v_total_prevu WHERE id = v_st_id;

  INSERT INTO public.executions (sous_tache_id, exercice_id, montant_realise, date_maj, updated_by)
  VALUES (v_st_id, v_ex_id, v_total_execute, now(), auth.uid())
  ON CONFLICT (sous_tache_id, exercice_id)
  DO UPDATE SET montant_realise = v_total_execute, date_maj = now(), updated_by = auth.uid();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';