
-- Fix search_path on sync_tache_budget function
CREATE OR REPLACE FUNCTION public.sync_tache_budget()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tache_id uuid;
  v_activite_id uuid;
  v_exercice_id uuid;
BEGIN
  v_tache_id := COALESCE(NEW.tache_id, OLD.tache_id);
  UPDATE taches SET budget_total = (SELECT COALESCE(SUM(budget_prevu), 0) FROM sous_taches WHERE tache_id = v_tache_id) WHERE id = v_tache_id;
  SELECT activite_id INTO v_activite_id FROM taches WHERE id = v_tache_id;
  UPDATE activites SET budget_total = (SELECT COALESCE(SUM(budget_total), 0) FROM taches WHERE activite_id = v_activite_id) WHERE id = v_activite_id;
  SELECT exercice_id INTO v_exercice_id FROM activites WHERE id = v_activite_id;
  UPDATE exercices SET budget_total = (SELECT COALESCE(SUM(budget_total), 0) FROM activites WHERE exercice_id = v_exercice_id) WHERE id = v_exercice_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;
