
-- STEP 1: Fix existing data
UPDATE taches t
SET budget_total = (
  SELECT COALESCE(SUM(st.budget_prevu), 0)
  FROM sous_taches st
  WHERE st.tache_id = t.id
);

UPDATE activites a
SET budget_total = (
  SELECT COALESCE(SUM(t.budget_total), 0)
  FROM taches t
  WHERE t.activite_id = a.id
);

UPDATE exercices e
SET budget_total = (
  SELECT COALESCE(SUM(a.budget_total), 0)
  FROM activites a
  WHERE a.exercice_id = e.id
);

-- STEP 2: Create trigger function for auto-sync
CREATE OR REPLACE FUNCTION public.sync_tache_budget()
RETURNS TRIGGER AS $$
DECLARE
  v_tache_id uuid;
  v_activite_id uuid;
  v_exercice_id uuid;
BEGIN
  v_tache_id := COALESCE(NEW.tache_id, OLD.tache_id);

  -- Recalculate tâche budget
  UPDATE taches
  SET budget_total = (
    SELECT COALESCE(SUM(budget_prevu), 0)
    FROM sous_taches
    WHERE tache_id = v_tache_id
  )
  WHERE id = v_tache_id;

  -- Get parent activite
  SELECT activite_id INTO v_activite_id FROM taches WHERE id = v_tache_id;

  -- Recalculate activité budget
  UPDATE activites
  SET budget_total = (
    SELECT COALESCE(SUM(budget_total), 0)
    FROM taches
    WHERE activite_id = v_activite_id
  )
  WHERE id = v_activite_id;

  -- Get parent exercice
  SELECT exercice_id INTO v_exercice_id FROM activites WHERE id = v_activite_id;

  -- Recalculate exercice budget
  UPDATE exercices
  SET budget_total = (
    SELECT COALESCE(SUM(budget_total), 0)
    FROM activites
    WHERE exercice_id = v_exercice_id
  )
  WHERE id = v_exercice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Create trigger
DROP TRIGGER IF EXISTS trg_sync_tache_budget ON sous_taches;
CREATE TRIGGER trg_sync_tache_budget
AFTER INSERT OR UPDATE OF budget_prevu OR DELETE
ON sous_taches
FOR EACH ROW
EXECUTE FUNCTION public.sync_tache_budget();
