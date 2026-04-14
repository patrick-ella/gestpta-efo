
-- Add new columns to extrants_criteres
ALTER TABLE public.extrants_criteres
  ADD COLUMN IF NOT EXISTS valeur_realisee NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS produit_avec_ecart BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_production_effective DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS observation_ecart TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS statut_critere TEXT NOT NULL DEFAULT 'non_produit';

CREATE INDEX IF NOT EXISTS idx_criteres_statut ON public.extrants_criteres(statut_critere);

-- Trigger to auto-compute statut_critere on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.auto_compute_critere_statut()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.type_critere = 'quantitatif' THEN
    IF NEW.valeur_realisee IS NULL OR NEW.valeur_realisee <= 0 THEN
      NEW.statut_critere := 'non_produit';
      NEW.valide_final := false;
    ELSIF NEW.valeur_realisee >= COALESCE(NEW.seuil_valeur, 0) THEN
      NEW.statut_critere := 'produit_conforme';
      NEW.valide_final := true;
    ELSIF NEW.observation_ecart IS NOT NULL AND LENGTH(TRIM(NEW.observation_ecart)) > 0 THEN
      NEW.statut_critere := 'produit_avec_ecart';
      NEW.valide_final := false;
    ELSE
      NEW.statut_critere := 'en_cours';
      NEW.valide_final := false;
    END IF;

  ELSIF NEW.type_critere = 'binaire' THEN
    IF NEW.produit_avec_ecart = true AND NEW.observation_ecart IS NOT NULL AND LENGTH(TRIM(NEW.observation_ecart)) > 0 THEN
      NEW.statut_critere := 'produit_avec_ecart';
      NEW.valide_final := false;
    ELSIF NEW.valide_manuellement = true THEN
      NEW.statut_critere := 'produit_conforme';
      NEW.valide_final := true;
    ELSE
      NEW.statut_critere := 'non_produit';
      NEW.valide_final := false;
    END IF;

  ELSIF NEW.type_critere = 'date' THEN
    IF NEW.date_production_effective IS NOT NULL THEN
      IF NEW.date_echeance IS NOT NULL AND NEW.date_production_effective > NEW.date_echeance THEN
        NEW.statut_critere := 'produit_avec_ecart';
        NEW.valide_final := false;
      ELSE
        NEW.statut_critere := 'produit_conforme';
        NEW.valide_final := true;
      END IF;
    ELSIF NEW.date_echeance IS NOT NULL AND CURRENT_DATE > NEW.date_echeance THEN
      NEW.statut_critere := 'non_produit';
      NEW.valide_final := false;
    ELSIF NEW.date_echeance IS NOT NULL AND CURRENT_DATE <= NEW.date_echeance THEN
      NEW.statut_critere := 'en_cours';
      NEW.valide_final := false;
    ELSE
      NEW.statut_critere := 'non_produit';
      NEW.valide_final := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_critere_statut ON public.extrants_criteres;
CREATE TRIGGER trg_auto_critere_statut
  BEFORE INSERT OR UPDATE
  ON public.extrants_criteres
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_compute_critere_statut();

-- Update recalculate_extrant_statut to use statut_critere
CREATE OR REPLACE FUNCTION public.recalculate_extrant_statut(p_extrant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total INT;
  v_conformes INT;
  v_ecarts INT;
  v_en_cours INT;
  v_new_statut TEXT;
  v_statut_mode TEXT;
BEGIN
  SELECT statut_mode INTO v_statut_mode FROM public.extrants WHERE id = p_extrant_id;
  IF v_statut_mode = 'manuel' THEN RETURN; END IF;

  -- Auto-validate binaire criteria (avancement_100)
  UPDATE public.extrants_criteres ec
  SET valide_auto = EXISTS (
    SELECT 1 FROM public.criteres_sous_taches cst
    JOIN public.executions e ON e.sous_tache_id = cst.sous_tache_id
    WHERE cst.critere_id = ec.id AND cst.condition_type = 'avancement_100' AND e.avancement_pct = 100
  )
  WHERE ec.extrant_id = p_extrant_id AND ec.type_critere = 'binaire';

  -- Auto-validate avancement_seuil criteria
  UPDATE public.extrants_criteres ec
  SET valide_auto = EXISTS (
    SELECT 1 FROM public.criteres_sous_taches cst
    JOIN public.executions e ON e.sous_tache_id = cst.sous_tache_id
    WHERE cst.critere_id = ec.id AND cst.condition_type = 'avancement_seuil' AND e.avancement_pct >= cst.condition_seuil
  )
  WHERE ec.extrant_id = p_extrant_id AND ec.type_critere = 'quantitatif';

  -- Auto-validate date criteria
  UPDATE public.extrants_criteres ec
  SET valide_auto = EXISTS (
    SELECT 1 FROM public.criteres_sous_taches cst
    JOIN public.executions e ON e.sous_tache_id = cst.sous_tache_id
    WHERE cst.critere_id = ec.id AND cst.condition_type = 'date_avant' AND e.avancement_pct = 100 AND e.date_maj::DATE <= ec.date_echeance
  )
  WHERE ec.extrant_id = p_extrant_id AND ec.type_critere = 'date';

  -- Count by statut_critere
  SELECT COUNT(*) INTO v_total FROM public.extrants_criteres WHERE extrant_id = p_extrant_id;
  SELECT COUNT(*) INTO v_conformes FROM public.extrants_criteres WHERE extrant_id = p_extrant_id AND statut_critere = 'produit_conforme';
  SELECT COUNT(*) INTO v_ecarts FROM public.extrants_criteres WHERE extrant_id = p_extrant_id AND statut_critere = 'produit_avec_ecart';
  SELECT COUNT(*) INTO v_en_cours FROM public.extrants_criteres WHERE extrant_id = p_extrant_id AND statut_critere = 'en_cours';

  IF v_total = 0 THEN
    v_new_statut := 'non_produit';
  ELSIF v_conformes = v_total THEN
    v_new_statut := 'produit';
    UPDATE public.extrants SET date_production = CURRENT_DATE WHERE id = p_extrant_id AND date_production IS NULL;
  ELSIF (v_conformes + v_ecarts) = v_total THEN
    v_new_statut := 'produit';
    UPDATE public.extrants SET date_production = CURRENT_DATE WHERE id = p_extrant_id AND date_production IS NULL;
  ELSIF v_conformes > 0 OR v_ecarts > 0 OR v_en_cours > 0 THEN
    v_new_statut := 'en_cours';
  ELSE
    v_new_statut := 'non_produit';
  END IF;

  UPDATE public.extrants SET statut = v_new_statut, statut_mode = 'auto', updated_at = now() WHERE id = p_extrant_id;
END;
$$;
